import { pgTable, serial, text, integer, real, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("users_email_unique").on(t.email)]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, passwordHash: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const carsTable = pgTable("cars", {
  id: serial("id").primaryKey(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  nickname: text("nickname"),
  color: text("color"),
  licensePlate: text("license_plate"),
  licenseValidUntil: text("license_valid_until"),
  vin: text("vin"),
  insuredWith: text("insured_with"),
  insuredUntil: text("insured_until"),
  mileage: integer("mileage"),
  notes: text("notes"),
  photos: text("photos"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarSchema = createInsertSchema(carsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof carsTable.$inferSelect;

export const maintenanceTable = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  mileage: integer("mileage"),
  cost: real("cost"),
  shop: text("shop"),
  notes: text("notes"),
  nextDueDate: text("next_due_date"),
  nextDueMileage: integer("next_due_mileage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceSchema = createInsertSchema(maintenanceTable).omit({ id: true, createdAt: true });
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type MaintenanceRecord = typeof maintenanceTable.$inferSelect;

export const partsTable = pgTable("parts_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
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
});

export const insertPartsSchema = createInsertSchema(partsTable).omit({ id: true, createdAt: true });
export type InsertParts = z.infer<typeof insertPartsSchema>;
export type PartsRecord = typeof partsTable.$inferSelect;

export const insuranceTable = pgTable("insurance_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
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
});

export const insertInsuranceSchema = createInsertSchema(insuranceTable).omit({ id: true, createdAt: true });
export type InsertInsurance = z.infer<typeof insertInsuranceSchema>;
export type InsuranceRecord = typeof insuranceTable.$inferSelect;

export const dealershipsTable = pgTable("dealership_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
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
});

export const insertDealershipSchema = createInsertSchema(dealershipsTable).omit({ id: true, createdAt: true });
export type InsertDealership = z.infer<typeof insertDealershipSchema>;
export type DealershipRecord = typeof dealershipsTable.$inferSelect;

export const fuelTable = pgTable("fuel_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  mileage: integer("mileage").notNull(),
  liters: real("liters").notNull(),
  pricePerLiter: real("price_per_liter"),
  totalCost: real("total_cost").notNull(),
  fuelType: text("fuel_type"),
  station: text("station"),
  fullTank: boolean("full_tank"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFuelSchema = createInsertSchema(fuelTable).omit({ id: true, createdAt: true });
export type InsertFuel = z.infer<typeof insertFuelSchema>;
export type FuelRecord = typeof fuelTable.$inferSelect;

export const malfunctionsTable = pgTable("malfunctions_records", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  inputMethod: text("input_method").notNull(),
  description: text("description").notNull(),
  odometer: integer("odometer"),
  phase: text("phase").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMalfunctionSchema = createInsertSchema(malfunctionsTable)
  .omit({ id: true, createdAt: true })
  .extend({
    inputMethod: z.enum(["warning_message", "written"]),
    phase: z.enum(["car_running", "car_started", "parking", "during_drive"]),
  });
export type InsertMalfunction = z.infer<typeof insertMalfunctionSchema>;
export type MalfunctionRecord = typeof malfunctionsTable.$inferSelect;

export const eventCompletionsTable = pgTable("event_completions", {
  id: serial("id").primaryKey(),
  carId: integer("car_id").notNull().references(() => carsTable.id, { onDelete: "cascade" }),
  recordType: text("record_type").notNull(),
  recordId: integer("record_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});
