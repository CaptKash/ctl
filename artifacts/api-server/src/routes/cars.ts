import { Router } from "express";
import { db } from "@workspace/db";
import {
  carsTable,
  maintenanceTable,
  partsTable,
  insuranceTable,
  dealershipsTable,
  fuelTable,
  insertCarSchema,
  insertMaintenanceSchema,
  insertPartsSchema,
  insertInsuranceSchema,
  insertDealershipSchema,
  insertFuelSchema,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// Cars
router.get("/cars", async (_req, res) => {
  const cars = await db.select().from(carsTable).orderBy(desc(carsTable.createdAt));
  res.json(cars);
});

router.post("/cars", async (req, res) => {
  const body = insertCarSchema.parse(req.body);
  const [car] = await db.insert(carsTable).values(body).returning();
  res.status(201).json(car);
});

router.get("/cars/:carId", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId));
  if (!car) return res.status(404).json({ error: "Car not found" });
  res.json(car);
});

router.put("/cars/:carId", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertCarSchema.parse(req.body);
  const [car] = await db
    .update(carsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(carsTable.id, carId))
    .returning();
  if (!car) return res.status(404).json({ error: "Car not found" });
  res.json(car);
});

router.delete("/cars/:carId", async (req, res) => {
  const carId = parseInt(req.params.carId);
  await db.delete(carsTable).where(eq(carsTable.id, carId));
  res.json({ success: true });
});

// Maintenance
router.get("/cars/:carId/maintenance", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const records = await db
    .select()
    .from(maintenanceTable)
    .where(eq(maintenanceTable.carId, carId))
    .orderBy(desc(maintenanceTable.date));
  res.json(records);
});

router.post("/cars/:carId/maintenance", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertMaintenanceSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(maintenanceTable).values(body).returning();
  res.status(201).json(record);
});

router.put("/cars/:carId/maintenance/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  const body = insertMaintenanceSchema.parse({ ...req.body, carId });
  const [record] = await db
    .update(maintenanceTable)
    .set(body)
    .where(and(eq(maintenanceTable.id, recordId), eq(maintenanceTable.carId, carId)))
    .returning();
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
});

router.delete("/cars/:carId/maintenance/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(maintenanceTable)
    .where(and(eq(maintenanceTable.id, recordId), eq(maintenanceTable.carId, carId)));
  res.json({ success: true });
});

// Parts
router.get("/cars/:carId/parts", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const records = await db
    .select()
    .from(partsTable)
    .where(eq(partsTable.carId, carId))
    .orderBy(desc(partsTable.createdAt));
  res.json(records);
});

router.post("/cars/:carId/parts", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertPartsSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(partsTable).values(body).returning();
  res.status(201).json(record);
});

router.put("/cars/:carId/parts/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  const body = insertPartsSchema.parse({ ...req.body, carId });
  const [record] = await db
    .update(partsTable)
    .set(body)
    .where(and(eq(partsTable.id, recordId), eq(partsTable.carId, carId)))
    .returning();
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
});

router.delete("/cars/:carId/parts/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(partsTable)
    .where(and(eq(partsTable.id, recordId), eq(partsTable.carId, carId)));
  res.json({ success: true });
});

// Insurance
router.get("/cars/:carId/insurance", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const records = await db
    .select()
    .from(insuranceTable)
    .where(eq(insuranceTable.carId, carId))
    .orderBy(desc(insuranceTable.createdAt));
  res.json(records);
});

router.post("/cars/:carId/insurance", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertInsuranceSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(insuranceTable).values(body).returning();
  res.status(201).json(record);
});

router.put("/cars/:carId/insurance/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  const body = insertInsuranceSchema.parse({ ...req.body, carId });
  const [record] = await db
    .update(insuranceTable)
    .set(body)
    .where(and(eq(insuranceTable.id, recordId), eq(insuranceTable.carId, carId)))
    .returning();
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
});

router.delete("/cars/:carId/insurance/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(insuranceTable)
    .where(and(eq(insuranceTable.id, recordId), eq(insuranceTable.carId, carId)));
  res.json({ success: true });
});

// Dealerships
router.get("/cars/:carId/dealerships", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const records = await db
    .select()
    .from(dealershipsTable)
    .where(eq(dealershipsTable.carId, carId))
    .orderBy(desc(dealershipsTable.visitDate));
  res.json(records);
});

router.post("/cars/:carId/dealerships", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertDealershipSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(dealershipsTable).values(body).returning();
  res.status(201).json(record);
});

router.put("/cars/:carId/dealerships/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  const body = insertDealershipSchema.parse({ ...req.body, carId });
  const [record] = await db
    .update(dealershipsTable)
    .set(body)
    .where(and(eq(dealershipsTable.id, recordId), eq(dealershipsTable.carId, carId)))
    .returning();
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
});

router.delete("/cars/:carId/dealerships/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(dealershipsTable)
    .where(and(eq(dealershipsTable.id, recordId), eq(dealershipsTable.carId, carId)));
  res.json({ success: true });
});

// Fuel
router.get("/cars/:carId/fuel", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const records = await db
    .select()
    .from(fuelTable)
    .where(eq(fuelTable.carId, carId))
    .orderBy(desc(fuelTable.date));
  res.json(records);
});

router.post("/cars/:carId/fuel", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertFuelSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(fuelTable).values(body).returning();
  res.status(201).json(record);
});

router.put("/cars/:carId/fuel/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  const body = insertFuelSchema.parse({ ...req.body, carId });
  const [record] = await db
    .update(fuelTable)
    .set(body)
    .where(and(eq(fuelTable.id, recordId), eq(fuelTable.carId, carId)))
    .returning();
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
});

router.delete("/cars/:carId/fuel/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(fuelTable)
    .where(and(eq(fuelTable.id, recordId), eq(fuelTable.carId, carId)));
  res.json({ success: true });
});

// Report
router.get("/cars/:carId/report", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const [car] = await db.select().from(carsTable).where(eq(carsTable.id, carId));
  if (!car) return res.status(404).json({ error: "Car not found" });

  const maintenance = await db.select().from(maintenanceTable).where(eq(maintenanceTable.carId, carId));
  const parts = await db.select().from(partsTable).where(eq(partsTable.carId, carId));
  const insurance = await db.select().from(insuranceTable).where(eq(insuranceTable.carId, carId));
  const fuel = await db.select().from(fuelTable).where(eq(fuelTable.carId, carId));
  const dealerships = await db.select().from(dealershipsTable).where(eq(dealershipsTable.carId, carId));

  const today = new Date().toISOString().split("T")[0];

  const totalMaintenanceCost = maintenance.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalPartsCost = parts.reduce((s, r) => s + (r.cost ?? 0) * (r.quantity ?? 1), 0);
  const totalInsuranceCost = insurance.reduce((s, r) => s + (r.premium ?? 0), 0);
  const totalFuelCost = fuel.reduce((s, r) => s + (r.totalCost ?? 0), 0);

  const upcomingMaintenanceDue = maintenance.filter(
    (r) => r.nextDueDate && r.nextDueDate >= today
  );

  const recentActivity = [
    ...maintenance.map((r) => ({ type: "maintenance", description: r.description, date: r.date, cost: r.cost ?? null })),
    ...parts.map((r) => ({ type: "parts", description: r.name, date: r.installedDate ?? r.createdAt.toISOString().split("T")[0], cost: r.cost ?? null })),
    ...fuel.map((r) => ({ type: "fuel", description: `${r.liters}L fuel`, date: r.date, cost: r.totalCost })),
    ...dealerships.map((r) => ({ type: "dealership", description: `${r.name} - ${r.purpose}`, date: r.visitDate, cost: r.cost ?? null })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const sortedMaintenance = [...maintenance].sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    car,
    totalMaintenanceCost,
    totalPartsCost,
    totalInsuranceCost,
    totalFuelCost,
    totalCost: totalMaintenanceCost + totalPartsCost + totalInsuranceCost + totalFuelCost,
    maintenanceCount: maintenance.length,
    partsCount: parts.length,
    fuelCount: fuel.length,
    lastMaintenance: sortedMaintenance[0]?.date ?? null,
    upcomingMaintenanceDue,
    recentActivity,
  });
});

export default router;
