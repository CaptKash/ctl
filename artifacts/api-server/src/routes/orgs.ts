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

const router = Router();

router.use(requireAuth);
router.param("orgId", resolveOrgAccess);

const createOrgSchema = z.object({
  name: z.string().trim().min(1).max(120),
  // null / omitted = unlimited seats. Mirrors the purchased Enterprise tier
  // (10 / 50 / unlimited). The subscription itself is gated client-side via
  // RevenueCat (same trust model as Fleet); the server only enforces the
  // resulting seat limit on invites.
  seatLimit: z.number().int().positive().nullable().optional(),
});

const updateOrgSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  seatLimit: z.number().int().positive().nullable().optional(),
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

// ── Organizations ─────────────────────────────────────────────────────────

// Create an organization. The creator becomes its owner + an active admin.
router.post("/orgs", async (req, res) => {
  const userId = req.user!.id;
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid organization data", details: parsed.error.flatten() });
  }
  const seatLimit = parsed.data.seatLimit ?? null;

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
  if (parsed.data.seatLimit !== undefined) next.seatLimit = parsed.data.seatLimit;

  // Refuse to set a seat limit below the seats already occupied.
  if (parsed.data.seatLimit != null) {
    const used = await countSeats(org.id);
    if (parsed.data.seatLimit < used) {
      return res.status(409).json({ error: `Seat limit cannot be below current members (${used}).` });
    }
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

  if (org.seatLimit != null) {
    const used = await countSeats(org.id);
    if (used >= org.seatLimit) {
      return res.status(403).json({ error: "Seat limit reached for this plan." });
    }
  }

  const [member] = await db
    .insert(organizationMembersTable)
    .values({
      orgId: org.id,
      email,
      role: parsed.data.role,
      status: "invited",
      invitedByUserId: req.user!.id,
    })
    .returning();
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
