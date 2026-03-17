import { Router } from "express";
import { db } from "@workspace/db";
import {
  carsTable,
  maintenanceTable,
  partsTable,
  insuranceTable,
  dealershipsTable,
  fuelTable,
  malfunctionsTable,
  inspectionsTable,
  eventCompletionsTable,
  insertCarSchema,
  insertMaintenanceSchema,
  insertPartsSchema,
  insertInsuranceSchema,
  insertDealershipSchema,
  insertFuelSchema,
  insertMalfunctionSchema,
  insertInspectionSchema,
} from "@workspace/db";
import { eq, desc, and, isNotNull, asc } from "drizzle-orm";

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

// Upcoming maintenance (all cars)
router.get("/maintenance/upcoming", async (_req, res) => {
  const [maintenanceRecords, cars, inspectionRecords] = await Promise.all([
    db
      .select({
        id: maintenanceTable.id,
        carId: maintenanceTable.carId,
        type: maintenanceTable.type,
        description: maintenanceTable.description,
        nextDueDate: maintenanceTable.nextDueDate,
        nextDueMileage: maintenanceTable.nextDueMileage,
        make: carsTable.make,
        model: carsTable.model,
        year: carsTable.year,
        nickname: carsTable.nickname,
      })
      .from(maintenanceTable)
      .innerJoin(carsTable, eq(maintenanceTable.carId, carsTable.id))
      .where(isNotNull(maintenanceTable.nextDueDate))
      .orderBy(asc(maintenanceTable.nextDueDate)),
    db.select().from(carsTable),
    db
      .select({
        id: inspectionsTable.id,
        carId: inspectionsTable.carId,
        nextInspectionDate: inspectionsTable.nextInspectionDate,
        place: inspectionsTable.place,
        make: carsTable.make,
        model: carsTable.model,
        year: carsTable.year,
        nickname: carsTable.nickname,
      })
      .from(inspectionsTable)
      .innerJoin(carsTable, eq(inspectionsTable.carId, carsTable.id))
      .where(isNotNull(inspectionsTable.nextInspectionDate)),
  ]);

  const carLabel = (c: typeof cars[number]) =>
    c.nickname ?? `${c.year} ${c.make} ${c.model}`;

  const licenseItems = cars
    .filter((c) => c.licenseValidUntil)
    .map((c) => ({
      id: c.id,
      carId: c.id,
      itemKind: "license" as const,
      type: "License Expiry",
      description: `${carLabel(c)}${c.licensePlate ? ` · ${c.licensePlate}` : ""}`,
      nextDueDate: c.licenseValidUntil!,
      nextDueMileage: null,
      make: c.make,
      model: c.model,
      year: c.year,
      nickname: c.nickname ?? null,
    }));

  const insuranceItems = cars
    .filter((c) => c.insuredUntil)
    .map((c) => ({
      id: c.id,
      carId: c.id,
      itemKind: "insurance" as const,
      type: "Insurance Expiry",
      description: `${carLabel(c)}${c.insuredWith ? ` · ${c.insuredWith}` : ""}`,
      nextDueDate: c.insuredUntil!,
      nextDueMileage: null,
      make: c.make,
      model: c.model,
      year: c.year,
      nickname: c.nickname ?? null,
    }));

  const maintenanceItems = maintenanceRecords.map((r) => ({
    ...r,
    itemKind: "maintenance" as const,
    nickname: r.nickname ?? null,
  }));

  const inspectionItems = inspectionRecords
    .filter((r) => r.nextInspectionDate)
    .map((r) => ({
      id: r.id,
      carId: r.carId,
      itemKind: "inspection" as const,
      type: "Next Inspection",
      description: `${r.nickname ?? `${r.year} ${r.make} ${r.model}`}${r.place ? ` · ${r.place}` : ""}`,
      nextDueDate: r.nextInspectionDate!,
      nextDueMileage: null,
      make: r.make,
      model: r.model,
      year: r.year,
      nickname: r.nickname ?? null,
    }));

  const all = [...maintenanceItems, ...licenseItems, ...insuranceItems, ...inspectionItems].sort(
    (a, b) => a.nextDueDate!.localeCompare(b.nextDueDate!)
  );

  res.json(all);
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

// All maintenance logs across all cars
router.get("/maintenance", async (_req, res) => {
  const [records, cars] = await Promise.all([
    db.select().from(maintenanceTable).orderBy(desc(maintenanceTable.date)),
    db.select().from(carsTable),
  ]);
  const carsMap = new Map(cars.map((c) => [c.id, c]));
  res.json(records.map((r) => ({ ...r, car: carsMap.get(r.carId) ?? null })));
});

// All faults across all cars
router.get("/malfunctions", async (_req, res) => {
  const [records, completions, cars] = await Promise.all([
    db.select().from(malfunctionsTable).orderBy(desc(malfunctionsTable.createdAt)),
    db.select().from(eventCompletionsTable).where(eq(eventCompletionsTable.recordType, "malfunction")),
    db.select().from(carsTable),
  ]);
  const completedIds = new Set(completions.map((c) => c.recordId));
  const carsMap = new Map(cars.map((c) => [c.id, c]));
  res.json(records.map((r) => ({
    ...r,
    completed: completedIds.has(r.id),
    car: carsMap.get(r.carId) ?? null,
  })));
});

// Malfunctions
router.get("/cars/:carId/malfunctions", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const [records, completions] = await Promise.all([
    db.select().from(malfunctionsTable).where(eq(malfunctionsTable.carId, carId)).orderBy(desc(malfunctionsTable.createdAt)),
    db.select().from(eventCompletionsTable).where(and(eq(eventCompletionsTable.carId, carId), eq(eventCompletionsTable.recordType, "malfunction"))),
  ]);
  const completedIds = new Set(completions.map((c) => c.recordId));
  res.json(records.map((r) => ({ ...r, completed: completedIds.has(r.id) })));
});

router.post("/cars/:carId/malfunctions", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertMalfunctionSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(malfunctionsTable).values(body).returning();
  res.status(201).json(record);
});

router.delete("/cars/:carId/malfunctions/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(malfunctionsTable)
    .where(and(eq(malfunctionsTable.id, recordId), eq(malfunctionsTable.carId, carId)));
  res.json({ success: true });
});

// Inspections
router.get("/cars/:carId/inspections", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const records = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.carId, carId))
    .orderBy(desc(inspectionsTable.createdAt));
  res.json(records);
});

router.post("/cars/:carId/inspections", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const body = insertInspectionSchema.parse({ ...req.body, carId });
  const [record] = await db.insert(inspectionsTable).values(body).returning();
  res.status(201).json(record);
});

router.delete("/cars/:carId/inspections/:recordId", async (req, res) => {
  const recordId = parseInt(req.params.recordId);
  const carId = parseInt(req.params.carId);
  await db
    .delete(inspectionsTable)
    .where(and(eq(inspectionsTable.id, recordId), eq(inspectionsTable.carId, carId)));
  res.json({ success: true });
});

// Event completions
router.post("/cars/:carId/events/complete", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const { recordType, recordId } = req.body;
  if (!recordType || !recordId) {
    return res.status(400).json({ error: "recordType and recordId are required" });
  }
  await db.insert(eventCompletionsTable).values({ carId, recordType, recordId: parseInt(recordId) });
  res.json({ success: true });
});

// Events (unified timeline)
router.get("/cars/:carId/events", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const includeCompleted = req.query.includeCompleted === "true";

  const [maintenance, parts, insurance, dealerships, fuel, malfunctions, completions] = await Promise.all([
    db.select().from(maintenanceTable).where(eq(maintenanceTable.carId, carId)),
    db.select().from(partsTable).where(eq(partsTable.carId, carId)),
    db.select().from(insuranceTable).where(eq(insuranceTable.carId, carId)),
    db.select().from(dealershipsTable).where(eq(dealershipsTable.carId, carId)),
    db.select().from(fuelTable).where(eq(fuelTable.carId, carId)),
    db.select().from(malfunctionsTable).where(eq(malfunctionsTable.carId, carId)),
    db.select().from(eventCompletionsTable).where(eq(eventCompletionsTable.carId, carId)),
  ]);

  const completedKeys = new Set(completions.map((c) => `${c.recordType}-${c.recordId}`));

  const events = [
    ...maintenance.map((r) => ({
      id: r.id,
      type: "maintenance" as const,
      date: r.date,
      title: r.description,
      subtitle: `${r.type}${r.shop ? ` · ${r.shop}` : ""}`,
    })),
    ...parts.map((r) => ({
      id: r.id,
      type: "parts" as const,
      date: r.installedDate ?? r.createdAt.toISOString().split("T")[0],
      title: r.name,
      subtitle: `${r.category}${r.brand ? ` · ${r.brand}` : ""}`,
    })),
    ...insurance.map((r) => ({
      id: r.id,
      type: "insurance" as const,
      date: r.startDate,
      title: r.provider,
      subtitle: `${r.type} · ${r.policyNumber}`,
    })),
    ...dealerships.map((r) => ({
      id: r.id,
      type: "dealership" as const,
      date: r.visitDate,
      title: r.name,
      subtitle: r.purpose,
    })),
    ...fuel.map((r) => ({
      id: r.id,
      type: "fuel" as const,
      date: r.date,
      title: `${r.liters}L${r.fuelType ? ` ${r.fuelType}` : ""}`,
      subtitle: `${r.mileage.toLocaleString()} km${r.station ? ` · ${r.station}` : ""}`,
    })),
    ...malfunctions.map((r) => ({
      id: r.id,
      type: "malfunction" as const,
      date: r.date,
      title: r.description,
      subtitle: (r.phase ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      completed: completedKeys.has(`malfunction-${r.id}`),
    })),
  ]
    .filter((ev) => includeCompleted || !completedKeys.has(`${ev.type}-${ev.id}`))
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json(events);
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
