import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  carsTable,
  usersTable,
  organizationsTable,
  organizationMembersTable,
  insertCarSchema,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { resolveOrgAccess } from "../middlewares/orgAccess";
import { getEnterpriseSeatLimit } from "../lib/revenuecat";

const router = Router();

router.use(requireAuth);
router.param("orgId", resolveOrgAccess);

// Seat limits are NEVER accepted from the client — they are derived server-side
// from the owner's verified RevenueCat Enterprise entitlement (see
// `getEnterpriseSeatLimit`). The schemas below therefore only carry the name.
const createOrgSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const updateOrgSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "staff"]),
});

const roleSchema = z.object({ role: z.enum(["admin", "staff"]) });

/** Count occupied seats (invited + active) for seat-limit enforcement. */
async function countSeats(orgId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.orgId, orgId));
  return row?.n ?? 0;
}

/**
 * Authoritative seat limit for an org, derived from the OWNER's verified
 * RevenueCat entitlement (the owner is the subscriber). Returns `undefined`
 * when the owner has no active Enterprise entitlement. Throws if RevenueCat
 * is unreachable so callers fail closed.
 */
async function resolveOwnerSeatLimit(
  ownerUserId: number,
): Promise<number | null | undefined> {
  const [owner] = await db
    .select({ id: usersTable.id, isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, ownerUserId))
    .limit(1);
  if (!owner) return undefined;
  return getEnterpriseSeatLimit(owner);
}

// ── Organizations ─────────────────────────────────────────────────────────

// Create an organization. The creator becomes its owner + an active admin.
router.post("/orgs", async (req, res) => {
  const userId = req.user!.id;
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid organization data", details: parsed.error.flatten() });
  }

  // Seat limit comes from the creator's verified Enterprise entitlement, never
  // the request body — this prevents self-upgrading to a higher seat tier.
  let seatLimit: number | null | undefined;
  try {
    seatLimit = await getEnterpriseSeatLimit(req.user!);
  } catch {
    return res.status(503).json({ error: "Could not verify your subscription. Please try again." });
  }
  if (seatLimit === undefined) {
    return res.status(403).json({
      error: "An active CTL Enterprise subscription is required to create an organization.",
    });
  }

  const [me] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const org = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organizationsTable)
      .values({ name: parsed.data.name, ownerUserId: userId, seatLimit })
      .returning();
    await tx.insert(organizationMembersTable).values({
      orgId: created.id,
      userId,
      email: (me?.email ?? "").toLowerCase(),
      role: "admin",
      status: "active",
      invitedByUserId: userId,
    });
    return created;
  });

  return res.status(201).json({ organization: org, role: "admin" as const });
});

// List organizations the current user is an active member of.
router.get("/orgs", async (req, res) => {
  const userId = req.user!.id;
  const rows = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      seatLimit: organizationsTable.seatLimit,
      ownerUserId: organizationsTable.ownerUserId,
      createdAt: organizationsTable.createdAt,
      role: organizationMembersTable.role,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationMembersTable.orgId, organizationsTable.id))
    .where(
      and(
        eq(organizationMembersTable.userId, userId),
        eq(organizationMembersTable.status, "active"),
      ),
    );
  return res.json(rows);
});

// Pending invites addressed to the current user's email (any org).
router.get("/orgs/invites", async (req, res) => {
  const userId = req.user!.id;
  const [me] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const email = (me?.email ?? "").toLowerCase();
  if (!email) return res.json([]);

  const rows = await db
    .select({
      memberId: organizationMembersTable.id,
      orgId: organizationsTable.id,
      orgName: organizationsTable.name,
      role: organizationMembersTable.role,
      invitedAt: organizationMembersTable.createdAt,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationMembersTable.orgId, organizationsTable.id))
    .where(
      and(
        eq(organizationMembersTable.email, email),
        eq(organizationMembersTable.status, "invited"),
      ),
    );
  return res.json(rows);
});

// Accept an invite by member-row id (must match the caller's email).
router.post("/orgs/invites/:memberId/accept", async (req, res) => {
  const userId = req.user!.id;
  const memberId = parseInt(req.params.memberId, 10);
  if (Number.isNaN(memberId)) return res.status(400).json({ error: "Invalid invite id." });

  const [me] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const email = (me?.email ?? "").toLowerCase();

  const [invite] = await db
    .select()
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.id, memberId))
    .limit(1);
  if (!invite || invite.status !== "invited" || invite.email.toLowerCase() !== email) {
    return res.status(404).json({ error: "Invite not found" });
  }

  const [updated] = await db
    .update(organizationMembersTable)
    .set({ userId, status: "active", updatedAt: new Date() })
    .where(
      and(
        eq(organizationMembersTable.id, memberId),
        eq(organizationMembersTable.status, "invited"),
      ),
    )
    .returning();
  if (!updated) return res.status(409).json({ error: "Invite already handled." });
  return res.json({ orgId: updated.orgId, role: updated.role });
});

// Organization detail + members (any active member).
router.get("/orgs/:orgId", async (req, res) => {
  const { org, role } = req.orgAccess!;
  const members = await db
    .select({
      id: organizationMembersTable.id,
      userId: organizationMembersTable.userId,
      email: organizationMembersTable.email,
      role: organizationMembersTable.role,
      status: organizationMembersTable.status,
      name: usersTable.name,
    })
    .from(organizationMembersTable)
    .leftJoin(usersTable, eq(organizationMembersTable.userId, usersTable.id))
    .where(eq(organizationMembersTable.orgId, org.id));
  return res.json({ organization: org, role, members });
});

// Update name / seat limit (admin only).
router.patch("/orgs/:orgId", async (req, res) => {
  const { org, role } = req.orgAccess!;
  if (role !== "admin") return res.status(403).json({ error: "Admins only." });
  const parsed = updateOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid organization data", details: parsed.error.flatten() });
  }
  const next: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) next.name = parsed.data.name;

  // Refresh the seat limit from the owner's current entitlement (authoritative)
  // so plan upgrades/downgrades are reflected — never from client input. An
  // `undefined` result means no active entitlement: freeze the stored limit at
  // current usage so a stale purchased limit can never be used to grow the org.
  let seatLimit: number | null | undefined;
  try {
    seatLimit = await resolveOwnerSeatLimit(org.ownerUserId);
  } catch {
    return res.status(503).json({ error: "Could not verify the organization's subscription. Please try again." });
  }
  if (seatLimit === undefined) {
    next.seatLimit = await countSeats(org.id);
  } else {
    if (seatLimit != null) {
      const used = await countSeats(org.id);
      if (seatLimit < used) {
        return res.status(409).json({
          error: `Your plan's seat limit (${seatLimit}) is below the current members (${used}). Remove members or upgrade your plan.`,
        });
      }
    }
    next.seatLimit = seatLimit;
  }

  const [updated] = await db
    .update(organizationsTable)
    .set(next)
    .where(eq(organizationsTable.id, org.id))
    .returning();
  return res.json({ organization: updated });
});

// Delete an organization (owner only). Cascades to members + org vehicles.
router.delete("/orgs/:orgId", async (req, res) => {
  const { org } = req.orgAccess!;
  if (org.ownerUserId !== req.user!.id) {
    return res.status(403).json({ error: "Only the owner can delete the organization." });
  }
  await db.delete(organizationsTable).where(eq(organizationsTable.id, org.id));
  return res.json({ success: true });
});

// ── Organization vehicles ───────────────────────────────────────────────

// List vehicles owned by the organization (any active member).
router.get("/orgs/:orgId/cars", async (req, res) => {
  const { org } = req.orgAccess!;
  const cars = await db
    .select()
    .from(carsTable)
    .where(eq(carsTable.orgId, org.id))
    .orderBy(carsTable.createdAt);
  return res.json(cars);
});

// Add a vehicle to the organization (admin only). Org vehicles have no
// personal owner (`userId` NULL); access flows through membership.
router.post("/orgs/:orgId/cars", async (req, res) => {
  const { org, role } = req.orgAccess!;
  if (role !== "admin") return res.status(403).json({ error: "Admins only." });
  const parsed = insertCarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid car data", details: parsed.error.flatten() });
  }
  const [car] = await db
    .insert(carsTable)
    .values({ ...parsed.data, userId: null, orgId: org.id })
    .returning();
  return res.status(201).json(car);
});

// ── Members ─────────────────────────────────────────────────────────────

router.get("/orgs/:orgId/members", async (req, res) => {
  const { org } = req.orgAccess!;
  const members = await db
    .select({
      id: organizationMembersTable.id,
      userId: organizationMembersTable.userId,
      email: organizationMembersTable.email,
      role: organizationMembersTable.role,
      status: organizationMembersTable.status,
      name: usersTable.name,
    })
    .from(organizationMembersTable)
    .leftJoin(usersTable, eq(organizationMembersTable.userId, usersTable.id))
    .where(eq(organizationMembersTable.orgId, org.id));
  return res.json(members);
});

// Invite a member by email (admin only). Enforces the seat limit. If a user
// with that email already exists, the invite is linked to them immediately so
// it appears in their pending invites; they still accept explicitly.
router.post("/orgs/:orgId/members", async (req, res) => {
  const { org, role } = req.orgAccess!;
  if (role !== "admin") return res.status(403).json({ error: "Admins only." });
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid invite data", details: parsed.error.flatten() });
  }
  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: organizationMembersTable.id })
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.orgId, org.id),
        eq(organizationMembersTable.email, email),
      ),
    )
    .limit(1);
  if (existing) {
    return res.status(409).json({ error: "This email is already a member or has a pending invite." });
  }

  // Re-derive the authoritative limit from the owner's CURRENT entitlement so a
  // lapsed/downgraded plan is enforced regardless of the stored value. An
  // `undefined` result means the owner has no active Enterprise entitlement —
  // deny growth outright (never fall back to a stale stored limit). A thrown
  // error means RevenueCat is unreachable — fail closed with 503.
  let effectiveLimit: number | null;
  try {
    const fresh = await resolveOwnerSeatLimit(org.ownerUserId);
    if (fresh === undefined) {
      return res.status(403).json({
        error: "This organization's CTL Enterprise subscription is not active. Renew it to add members.",
      });
    }
    effectiveLimit = fresh;
    if (fresh !== org.seatLimit) {
      await db
        .update(organizationsTable)
        .set({ seatLimit: fresh, updatedAt: new Date() })
        .where(eq(organizationsTable.id, org.id));
    }
  } catch {
    return res.status(503).json({ error: "Could not verify the organization's subscription. Please try again." });
  }

  // Count seats and insert atomically: lock the org row so concurrent invites
  // for the same org serialize and cannot both pass the seat check before
  // committing (prevents over-allocation past the entitlement cap).
  const member = await db.transaction(async (tx) => {
    await tx
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, org.id))
      .for("update");

    if (effectiveLimit != null) {
      const [row] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(organizationMembersTable)
        .where(eq(organizationMembersTable.orgId, org.id));
      if ((row?.n ?? 0) >= effectiveLimit) return null;
    }

    const [created] = await tx
      .insert(organizationMembersTable)
      .values({
        orgId: org.id,
        email,
        role: parsed.data.role,
        status: "invited",
        invitedByUserId: req.user!.id,
      })
      .returning();
    return created;
  });

  if (!member) {
    return res.status(403).json({ error: "Seat limit reached for this plan." });
  }
  return res.status(201).json(member);
});

// Change a member's role (admin only). Cannot demote the owner; cannot remove
// the last admin.
router.patch("/orgs/:orgId/members/:memberId", async (req, res) => {
  const { org, role } = req.orgAccess!;
  if (role !== "admin") return res.status(403).json({ error: "Admins only." });
  const memberId = parseInt(req.params.memberId, 10);
  if (Number.isNaN(memberId)) return res.status(400).json({ error: "Invalid member id." });
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid role", details: parsed.error.flatten() });
  }

  const [member] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.id, memberId),
        eq(organizationMembersTable.orgId, org.id),
      ),
    )
    .limit(1);
  if (!member) return res.status(404).json({ error: "Member not found" });

  if (member.userId === org.ownerUserId && parsed.data.role !== "admin") {
    return res.status(409).json({ error: "The owner must remain an admin." });
  }

  if (member.role === "admin" && parsed.data.role !== "admin") {
    const [{ n: adminCount }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.orgId, org.id),
          eq(organizationMembersTable.role, "admin"),
        ),
      );
    if (adminCount <= 1) {
      return res.status(409).json({ error: "An organization must keep at least one admin." });
    }
  }

  const [updated] = await db
    .update(organizationMembersTable)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(organizationMembersTable.id, memberId))
    .returning();
  return res.json(updated);
});

// Remove a member (admin only). The owner cannot be removed.
router.delete("/orgs/:orgId/members/:memberId", async (req, res) => {
  const { org, role } = req.orgAccess!;
  if (role !== "admin") return res.status(403).json({ error: "Admins only." });
  const memberId = parseInt(req.params.memberId, 10);
  if (Number.isNaN(memberId)) return res.status(400).json({ error: "Invalid member id." });

  const [member] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.id, memberId),
        eq(organizationMembersTable.orgId, org.id),
      ),
    )
    .limit(1);
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (member.userId === org.ownerUserId) {
    return res.status(409).json({ error: "The owner cannot be removed." });
  }

  await db.delete(organizationMembersTable).where(eq(organizationMembersTable.id, memberId));
  return res.json({ success: true });
});

export default router;
