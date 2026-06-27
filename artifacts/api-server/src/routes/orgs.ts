import { Router } from "express";
import { and, eq, sql, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  carsTable,
  usersTable,
  organizationsTable,
  organizationMembersTable,
  insertCarSchema,
  maintenanceTable,
  malfunctionsTable,
  inspectionsTable,
  fuelTable,
  partsTable,
  insuranceTable,
  dealershipsTable,
  renewalsTable,
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
    return res.status(400).json({ error: "Invalid enterprise data", details: parsed.error.flatten() });
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
      error: "An active CTL Enterprise subscription is required to create an enterprise.",
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
    return res.status(400).json({ error: "Invalid enterprise data", details: parsed.error.flatten() });
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
    return res.status(503).json({ error: "Could not verify the enterprise's subscription. Please try again." });
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
    return res.status(403).json({ error: "Only the owner can delete the enterprise." });
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

// ── Oversight: recent activity ──────────────────────────────────────────

type ActivityKind =
  | "maintenance"
  | "fault"
  | "inspection"
  | "fuel"
  | "part"
  | "insurance"
  | "dealership"
  | "renewal";

type ActivityRaw = {
  id: number;
  carId: number;
  byUserId: number | null;
  createdAt: Date;
  date: string | null;
  title: string | null;
  kind: ActivityKind;
};

// Per-table cap before merging — generous for an oversight feed, bounded so a
// large fleet can never balloon the response.
const ACTIVITY_PER_TABLE = 100;
const ACTIVITY_LIMIT = 200;

// Admin-only oversight feed: recent record activity across all of the org's
// vehicles, attributed to the member who logged each entry. Staff are denied —
// this is a management view. Filtering by vehicle/member is done client-side
// from this feed.
router.get("/orgs/:orgId/activity", async (req, res) => {
  const { org, role } = req.orgAccess!;
  if (role !== "admin") return res.status(403).json({ error: "Admins only." });

  const cars = await db
    .select({
      id: carsTable.id,
      make: carsTable.make,
      model: carsTable.model,
      year: carsTable.year,
      nickname: carsTable.nickname,
      vehicleType: carsTable.vehicleType,
    })
    .from(carsTable)
    .where(eq(carsTable.orgId, org.id));
  if (cars.length === 0) return res.json([]);

  const carIds = cars.map((c) => c.id);
  const carMap = new Map(cars.map((c) => [c.id, c]));

  const collected: ActivityRaw[] = [];
  const push = (
    kind: ActivityKind,
    rows: { id: number; carId: number; byUserId: number | null; createdAt: Date; date: string | null; title: string | null }[],
  ) => {
    for (const r of rows) collected.push({ ...r, kind });
  };

  const [maint, faults, inspections, fuel, parts, insurance, dealerships, renewals] =
    await Promise.all([
      db.select({ id: maintenanceTable.id, carId: maintenanceTable.carId, byUserId: maintenanceTable.createdByUserId, createdAt: maintenanceTable.createdAt, date: maintenanceTable.date, title: maintenanceTable.description })
        .from(maintenanceTable).where(inArray(maintenanceTable.carId, carIds)).orderBy(sql`${maintenanceTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: malfunctionsTable.id, carId: malfunctionsTable.carId, byUserId: malfunctionsTable.createdByUserId, createdAt: malfunctionsTable.createdAt, date: malfunctionsTable.date, title: malfunctionsTable.description })
        .from(malfunctionsTable).where(inArray(malfunctionsTable.carId, carIds)).orderBy(sql`${malfunctionsTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: inspectionsTable.id, carId: inspectionsTable.carId, byUserId: inspectionsTable.createdByUserId, createdAt: inspectionsTable.createdAt, date: inspectionsTable.date, title: inspectionsTable.place })
        .from(inspectionsTable).where(inArray(inspectionsTable.carId, carIds)).orderBy(sql`${inspectionsTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: fuelTable.id, carId: fuelTable.carId, byUserId: fuelTable.createdByUserId, createdAt: fuelTable.createdAt, date: fuelTable.date, title: fuelTable.station })
        .from(fuelTable).where(inArray(fuelTable.carId, carIds)).orderBy(sql`${fuelTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: partsTable.id, carId: partsTable.carId, byUserId: partsTable.createdByUserId, createdAt: partsTable.createdAt, date: partsTable.installedDate, title: partsTable.name })
        .from(partsTable).where(inArray(partsTable.carId, carIds)).orderBy(sql`${partsTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: insuranceTable.id, carId: insuranceTable.carId, byUserId: insuranceTable.createdByUserId, createdAt: insuranceTable.createdAt, date: insuranceTable.startDate, title: insuranceTable.provider })
        .from(insuranceTable).where(inArray(insuranceTable.carId, carIds)).orderBy(sql`${insuranceTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: dealershipsTable.id, carId: dealershipsTable.carId, byUserId: dealershipsTable.createdByUserId, createdAt: dealershipsTable.createdAt, date: dealershipsTable.visitDate, title: dealershipsTable.name })
        .from(dealershipsTable).where(inArray(dealershipsTable.carId, carIds)).orderBy(sql`${dealershipsTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
      db.select({ id: renewalsTable.id, carId: renewalsTable.carId, byUserId: renewalsTable.createdByUserId, createdAt: renewalsTable.createdAt, date: renewalsTable.date, title: renewalsTable.type })
        .from(renewalsTable).where(inArray(renewalsTable.carId, carIds)).orderBy(sql`${renewalsTable.createdAt} desc`).limit(ACTIVITY_PER_TABLE),
    ]);

  push("maintenance", maint);
  push("fault", faults);
  push("inspection", inspections);
  push("fuel", fuel);
  push("part", parts);
  push("insurance", insurance);
  push("dealership", dealerships);
  push("renewal", renewals);

  collected.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const top = collected.slice(0, ACTIVITY_LIMIT);

  // Resolve creator names for attribution (distinct, non-null only).
  const userIds = [...new Set(top.map((a) => a.byUserId).filter((v): v is number => v != null))];
  const userMap = new Map<number, { name: string | null; email: string }>();
  if (userIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(inArray(usersTable.id, userIds));
    for (const u of users) userMap.set(u.id, { name: u.name, email: u.email });
  }

  const items = top.map((a) => {
    const car = carMap.get(a.carId);
    const by = a.byUserId != null ? userMap.get(a.byUserId) : undefined;
    return {
      id: a.id,
      kind: a.kind,
      carId: a.carId,
      car: car
        ? { id: car.id, make: car.make, model: car.model, year: car.year, nickname: car.nickname, vehicleType: car.vehicleType }
        : null,
      byUserId: a.byUserId,
      byName: by?.name ?? null,
      byEmail: by?.email ?? null,
      date: a.date,
      createdAt: a.createdAt,
      title: a.title,
    };
  });

  return res.json(items);
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
        error: "This enterprise's CTL Enterprise subscription is not active. Renew it to add members.",
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
    return res.status(503).json({ error: "Could not verify the enterprise's subscription. Please try again." });
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
      return res.status(409).json({ error: "An enterprise must keep at least one admin." });
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
