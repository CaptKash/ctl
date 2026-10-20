import { pgTable, serial, text, integer, real, boolean, timestamp, unique, uuid, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  country: text("country"),
  // Default `true` exists so that when this column is first added to a
  // populated database (i.e. the prod publish migration) every existing
  // row is backfilled with `true` automatically. New signups override
  // this with an explicit `false` in /auth/register.
  passwordUpgradeRequired: boolean("password_upgrade_required").default(true).notNull(),
  // Populated lazily as users sign in to the new Clerk-backed build for the
  // first time. NULL means "not yet migrated" (still on legacy bcrypt auth).
  // We never reuse Clerk's user id as our primary key — `id` (serial) stays
  // the source of truth so RevenueCat appUserIDs survive the migration.
  clerkUserId: text("clerk_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("users_email_unique").on(t.email),
  unique("users_clerk_user_id_unique").on(t.clerkUserId),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, passwordHash: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: uuid("token").notNull().default(sql`gen_random_uuid()`),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("prt_token_unique").on(t.token)]);

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;

// ── CTL Enterprise: organizations ────────────────────────────────────────
// A company/establishment that owns vehicles and records shared by multiple
// members. Fleet seats are admins/staff; repair-shop seats are clients.
// `organizationType` defaults to fleet so pre-existing organizations preserve
// their original behavior. `seatLimit` mirrors the purchased Enterprise tier
// (10 / 50 / unlimited); NULL means unlimited. The subscription entitlement
// itself is verified client-side via RevenueCat (consistent with how Fleet
// gating works today); the server enforces the seat limit on invites.
export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organizationType: text("organization_type", { enum: ["fleet", "repair_shop"] }).notNull().default("fleet"),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  seatLimit: integer("seat_limit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  check("organizations_type_check", sql`${t.organizationType} in ('fleet', 'repair_shop')`),
]);

export type Organization = typeof organizationsTable.$inferSelect;

// Membership of a user in an organization. Invites are created by email
// (`userId` NULL) and linked to a concrete user when that person signs in
// and accepts. Roles are admin, staff, or client; lifecycle status controls
// whether a membership occupies an organization seat.
export const organizationMembersTable = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull(),
  invitedByUserId: integer("invited_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("org_members_org_email_unique").on(t.orgId, t.email),
  index("org_members_org_id_idx").on(t.orgId),
  index("org_members_user_id_idx").on(t.userId),
]);

export type OrganizationMember = typeof organizationMembersTable.$inferSelect;

export const carsTable = pgTable("cars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  // When set, the vehicle belongs to an organization and access is governed
  // by membership/role rather than `userId`. Personal vehicles keep
  // `orgId` NULL (and `userId` set), so existing single-user behavior is
  // unchanged.
  orgId: integer("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  vehicleType: text("vehicle_type").default("car").notNull(),
  usageUnit: text("usage_unit").default("distance").notNull(),
  nickname: text("nickname"),
  color: text("color"),
  licensePlate: text("license_plate"),
  licenseValidUntil: text("license_valid_until"),
  vin: text("vin"),
  insuredWith: text("insured_with"),
  insuredUntil: text("insured_until"),
  mileage: integer("mileage"),
  tankCapacity: real("tank_capacity"),
  isElectric: boolean("is_electric").default(false).notNull(),
  notes: text("notes"),
  photos: text("photos"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("cars_user_id_idx").on(t.userId),
  index("cars_org_id_idx").on(t.orgId),
]);

export const insertCarSchema = createInsertSchema(carsTable).omit({ id: true, createdAt: true, updatedAt: true, userId: true, orgId: true });
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof carsTable.$inferSelect;

// This grants scoped access only; a personal car remains owned by its user.
export const organizationCarLinksTable = pgTable("organization_car_links", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => organizationMembersTable.id, { onDelete: "cascade" }),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // shop_assigned | personal_link
  status: text("status").notNull(), // pending | active | rejected | revoked | suspended
  requestedByUserId: integer("requested_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("org_car_links_org_member_car_unique").on(t.orgId, t.memberId, t.carId),
  index("org_car_links_org_id_idx").on(t.orgId),
  index("org_car_links_member_id_idx").on(t.memberId),
  index("org_car_links_car_id_idx").on(t.carId),
  index("org_car_links_org_status_idx").on(t.orgId, t.status),
]);

export const insertOrganizationCarLinkSchema = createInsertSchema(organizationCarLinksTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganizationCarLink = z.infer<typeof insertOrganizationCarLinkSchema>;
export type OrganizationCarLink = typeof organizationCarLinksTable.$inferSelect;

export const maintenanceTable = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  // Which user logged this record (for organization oversight). NULL for
  // legacy rows and personal records where attribution isn't needed.
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  mileage: integer("mileage"),
  cost: real("cost"),
  shop: text("shop"),
  shopAddress: text("shop_address"),
  shopPhone: text("shop_phone"),
  correctiveAction: text("corrective_action"),
  partsReplaced: text("parts_replaced"),
  warrantyPeriod: text("warranty_period"),
  warrantyDetails: text("warranty_details"),
  billPhoto: text("bill_photo"),
  warrantyPhoto: text("warranty_photo"),
  notes: text("notes"),
  nextDueDate: text("next_due_date"),
  nextDueMileage: integer("next_due_mileage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("maintenance_car_id_idx").on(t.carId)]);

export const insertMaintenanceSchema = createInsertSchema(maintenanceTable).omit({ id: true, createdAt: true, createdByUserId: true });
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type MaintenanceRecord = typeof maintenanceTable.$inferSelect;

export const partsTable = pgTable("parts_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  partNumber: text("part_number"),
  brand: text("brand"),
  category: text("category").notNull(),
  cost: real("cost"),
  quantity: integer("quantity"),
  installedDate: text("installed_date"),
  installedMileage: integer("installed_mileage"),
  supplier: text("supplier"),
  warranty: text("warranty"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("parts_car_id_idx").on(t.carId)]);

export const insertPartsSchema = createInsertSchema(partsTable).omit({ id: true, createdAt: true, createdByUserId: true });
export type InsertParts = z.infer<typeof insertPartsSchema>;
export type PartsRecord = typeof partsTable.$inferSelect;

export const insuranceTable = pgTable("insurance_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  policyNumber: text("policy_number").notNull(),
  type: text("type").notNull(),
  premium: real("premium"),
  premiumFrequency: text("premium_frequency"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  deductible: real("deductible"),
  coverageLimit: real("coverage_limit"),
  agentName: text("agent_name"),
  agentPhone: text("agent_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("insurance_car_id_idx").on(t.carId)]);

export const insertInsuranceSchema = createInsertSchema(insuranceTable).omit({ id: true, createdAt: true, createdByUserId: true });
export type InsertInsurance = z.infer<typeof insertInsuranceSchema>;
export type InsuranceRecord = typeof insuranceTable.$inferSelect;

export const dealershipsTable = pgTable("dealership_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),
  visitDate: text("visit_date").notNull(),
  purpose: text("purpose").notNull(),
  cost: real("cost"),
  notes: text("notes"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("dealerships_car_id_idx").on(t.carId)]);

export const insertDealershipSchema = createInsertSchema(dealershipsTable).omit({ id: true, createdAt: true, createdByUserId: true });
export type InsertDealership = z.infer<typeof insertDealershipSchema>;
export type DealershipRecord = typeof dealershipsTable.$inferSelect;

export const fuelTable = pgTable("fuel_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  mileage: integer("mileage").notNull(),
  liters: real("liters").notNull(),
  pricePerLiter: real("price_per_liter"),
  totalCost: real("total_cost").notNull(),
  fuelBefore: real("fuel_before"),
  tankAfter: real("tank_after"),
  fuelType: text("fuel_type"),
  station: text("station"),
  fullTank: boolean("full_tank"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("fuel_car_id_idx").on(t.carId)]);

export const insertFuelSchema = createInsertSchema(fuelTable).omit({ id: true, createdAt: true, createdByUserId: true });
export type InsertFuel = z.infer<typeof insertFuelSchema>;
export type FuelRecord = typeof fuelTable.$inferSelect;

export const malfunctionsTable = pgTable("malfunctions_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  inputMethod: text("input_method").notNull(),
  description: text("description").notNull(),
  odometer: integer("odometer"),
  phase: text("phase"),
  severity: text("severity"),
  actionTaken: text("action_taken"),
  dashboardMessage: text("dashboard_message"),
  warningMessage: text("warning_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("malfunctions_car_id_idx").on(t.carId)]);

export const insertMalfunctionSchema = createInsertSchema(malfunctionsTable)
  .omit({ id: true, createdAt: true, createdByUserId: true })
  .extend({
    inputMethod: z.enum(["warning_message", "written"]),
    phase: z.enum(["car_running", "car_started", "parking", "during_drive"]).nullable().optional(),
    severity: z.enum(["critical", "major", "minor", "cosmetic"]).nullable().optional(),
    actionTaken: z.string().nullable().optional(),
    dashboardMessage: z.string().nullable().optional(),
    warningMessage: z.string().nullable().optional(),
  });
export type InsertMalfunction = z.infer<typeof insertMalfunctionSchema>;
export type MalfunctionRecord = typeof malfunctionsTable.$inferSelect;

export const inspectionsTable = pgTable("inspection_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  place: text("place"),
  results: text("results"),
  cost: real("cost"),
  requiredRepairs: text("required_repairs"),
  nextInspectionDate: text("next_inspection_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("inspections_car_id_idx").on(t.carId)]);

export const insertInspectionSchema = createInsertSchema(inspectionsTable).omit({ id: true, createdAt: true, createdByUserId: true });
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type InspectionRecord = typeof inspectionsTable.$inferSelect;

export const renewalsTable = pgTable("renewal_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  date: text("date").notNull(),
  validUntil: text("valid_until"),
  provider: text("provider"),
  referenceNumber: text("reference_number"),
  cost: real("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("renewals_car_id_idx").on(t.carId)]);

export const insertRenewalSchema = createInsertSchema(renewalsTable)
  .omit({ id: true, createdAt: true, createdByUserId: true })
  .extend({
    type: z.enum(["license", "insurance"]),
  });
export type InsertRenewal = z.infer<typeof insertRenewalSchema>;
export type RenewalRecord = typeof renewalsTable.$inferSelect;

export const eventCompletionsTable = pgTable("event_completions", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  recordType: text("record_type").notNull(),
  recordId: integer("record_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (t) => [index("event_completions_car_id_idx").on(t.carId)]);
