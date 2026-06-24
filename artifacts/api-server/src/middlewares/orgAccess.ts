import { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  carsTable,
  organizationsTable,
  organizationMembersTable,
  type Car,
  type Organization,
  type OrganizationMember,
} from "@workspace/db";

export type MemberRole = "admin" | "staff";
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

function normalizeRole(role: string): MemberRole {
  return role === "admin" ? "admin" : "staff";
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
      if (m) {
        req.carAccess = { car, role: normalizeRole(m.role) };
        return next();
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
