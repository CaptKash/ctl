import { Request, Response, NextFunction } from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  carsTable,
  organizationsTable,
  organizationMembersTable,
  organizationCarLinksTable,
  type Car,
  type Organization,
  type OrganizationMember,
} from "@workspace/db";

export type MemberRole = "admin" | "staff" | "client";
// "owner" is the personal owner of a car (userId match) — distinct from an
// organization admin. Both may mutate the vehicle entity.
export type CarRole = "owner" | MemberRole;

export interface CarAccess {
  car: Car;
  role: CarRole;
}

export interface OrgAccess {
  org: Organization;
  role: MemberRole;
}

declare global {
  namespace Express {
    interface Request {
      carAccess?: CarAccess;
      orgAccess?: OrgAccess;
    }
  }
}

export function normalizeRole(role: string): MemberRole {
  if (role === "admin" || role === "client") return role;
  return "staff";
}

/**
 * Return the requesting user's ACTIVE membership row in an organization, or
 * null. Invited-but-not-accepted memberships do not grant access.
 */
export async function getActiveMembership(
  userId: number,
  orgId: number,
): Promise<OrganizationMember | null> {
  const [m] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.orgId, orgId),
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "active"),
      ),
    )
    .limit(1);
  return m ?? null;
}

/** Central source of truth for organization-scoped vehicle visibility. */
export async function getAccessibleOrgCarIds(
  userId: number,
  orgId: number,
): Promise<number[]> {
  const member = await getActiveMembership(userId, orgId);
  if (!member) return [];
  const role = normalizeRole(member.role);
  if (role === "admin" || role === "staff") {
    const [owned, linked] = await Promise.all([
      db.select({ id: carsTable.id }).from(carsTable).where(eq(carsTable.orgId, orgId)),
      db.select({ carId: organizationCarLinksTable.carId })
        .from(organizationCarLinksTable)
        .where(and(
          eq(organizationCarLinksTable.orgId, orgId),
          eq(organizationCarLinksTable.status, "active"),
          eq(organizationCarLinksTable.type, "personal_link"),
        )),
    ]);
    return [...new Set([...owned.map((c) => c.id), ...linked.map((l) => l.carId)])];
  }
  const links = await db.select({ carId: organizationCarLinksTable.carId })
    .from(organizationCarLinksTable)
    .where(and(
      eq(organizationCarLinksTable.orgId, orgId),
      eq(organizationCarLinksTable.memberId, member.id),
      eq(organizationCarLinksTable.status, "active"),
    ));
  return links.map((l) => l.carId);
}

/**
 * Express param middleware for `:carId`. Resolves the car and the requesting
 * user's effective role, attaching `req.carAccess`. A user may access a car
 * if they personally own it (`userId` match → role "owner") or are an active
 * member of the owning organization (role "admin"/"staff"). Otherwise 404 —
 * we use 404 (not 403) so we never reveal that a car id exists.
 *
 * This guard runs for EVERY `/cars/:carId/...` route, which both adds
 * organization scoping and closes the pre-existing gap where per-car record
 * routes trusted the carId without verifying ownership.
 */
export async function resolveCarAccess(
  req: Request,
  res: Response,
  next: NextFunction,
  carIdRaw: string,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required." });
    const carId = parseInt(carIdRaw, 10);
    if (Number.isNaN(carId)) return res.status(400).json({ error: "Invalid car id." });

    const [car] = await db
      .select()
      .from(carsTable)
      .where(eq(carsTable.id, carId))
      .limit(1);
    if (!car) return res.status(404).json({ error: "Car not found" });

    if (car.userId === userId) {
      req.carAccess = { car, role: "owner" };
      return next();
    }

    if (car.orgId != null) {
      const m = await getActiveMembership(userId, car.orgId);
      if (m && normalizeRole(m.role) !== "client") {
        req.carAccess = { car, role: normalizeRole(m.role) };
        return next();
      }
      if (m && normalizeRole(m.role) === "client") {
        const [link] = await db.select({ id: organizationCarLinksTable.id })
          .from(organizationCarLinksTable)
          .where(and(eq(organizationCarLinksTable.orgId, car.orgId), eq(organizationCarLinksTable.memberId, m.id), eq(organizationCarLinksTable.carId, car.id), eq(organizationCarLinksTable.status, "active"), eq(organizationCarLinksTable.type, "shop_assigned")))
          .limit(1);
        if (link) {
          req.carAccess = { car, role: "client" };
          return next();
        }
      }
    } else {
      // A personal car can be visible to an organization only through an active
      // personal link. Its owner was handled above and retains owner rights.
      const memberships = await db.select()
        .from(organizationMembersTable)
        .where(and(eq(organizationMembersTable.userId, userId), eq(organizationMembersTable.status, "active")));
      if (!memberships.length) return res.status(404).json({ error: "Car not found" });
      const [link] = await db.select({ memberId: organizationCarLinksTable.memberId, orgId: organizationCarLinksTable.orgId })
        .from(organizationCarLinksTable)
        .where(and(eq(organizationCarLinksTable.carId, car.id), eq(organizationCarLinksTable.status, "active"), eq(organizationCarLinksTable.type, "personal_link"), inArray(organizationCarLinksTable.orgId, memberships.map((m) => m.orgId))))
        .limit(1);
      if (link) {
        const m = memberships.find((membership) => membership.orgId === link.orgId);
        if (m && (normalizeRole(m.role) !== "client" || m.id === link.memberId)) {
          req.carAccess = { car, role: normalizeRole(m.role) };
          return next();
        }
      }
    }

    return res.status(404).json({ error: "Car not found" });
  } catch (err) {
    console.error("resolveCarAccess error:", err);
    return res.status(500).json({ error: "Access check failed." });
  }
}

/**
 * Express param middleware for `:orgId`. Requires the requesting user to be an
 * active member of the organization, attaching `req.orgAccess`. 404 if the org
 * doesn't exist or the user isn't a member.
 */
export async function resolveOrgAccess(
  req: Request,
  res: Response,
  next: NextFunction,
  orgIdRaw: string,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required." });
    const orgId = parseInt(orgIdRaw, 10);
    if (Number.isNaN(orgId)) return res.status(400).json({ error: "Invalid organization id." });

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    const m = await getActiveMembership(userId, orgId);
    if (!m) return res.status(404).json({ error: "Organization not found" });

    req.orgAccess = { org, role: normalizeRole(m.role) };
    return next();
  } catch (err) {
    console.error("resolveOrgAccess error:", err);
    return res.status(500).json({ error: "Access check failed." });
  }
}

/** Vehicle-entity mutations (create/edit/delete a car) are owner/admin only. */
export function canMutateVehicle(role: CarRole): boolean {
  return role === "owner" || role === "admin";
}

export function canMutateRecords(role: CarRole): boolean {
  return role !== "client";
}
