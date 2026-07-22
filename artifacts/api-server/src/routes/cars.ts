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
  renewalsTable,
  insertCarSchema,
  insertMaintenanceSchema,
  insertPartsSchema,
  insertInsuranceSchema,
  insertDealershipSchema,
  insertFuelSchema,
  insertMalfunctionSchema,
  insertInspectionSchema,
  insertRenewalSchema,
} from "@workspace/db";
import { eq, desc, and, isNotNull, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/auth";
import { resolveCarAccess, canMutateVehicle } from "../middlewares/orgAccess";
import {
  buildLicenseItems,
  buildInsuranceItems,
  buildMaintenanceItems,
  buildInspectionItems,
} from "../lib/upcomingItems";

const router = Router();

router.use(requireAuth);
// Every `/cars/:carId/...` route is authorized here: the car must be owned by
// the requester (personal) or belong to an organization they actively belong
// to. Attaches `req.carAccess` with the resolved car + effective role.
router.param("carId", resolveCarAccess);

router.post("/cars/estimate-tank-capacity", async (req, res) => {
  const { make, model, year } = req.body ?? {};
  if (!make || !model) {
    return res.status(400).json({ error: "make and model are required" });
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are an automotive expert. Given a car\'s make, model, and year, return the typical fuel tank capacity in liters. Respond with ONLY a JSON object of the form {"liters": number}. Use the most common variant if trims differ. If the exact model is unknown, estimate from the vehicle class. Never return 0 or null.',
        },
        {
          role: "user",
          content: `${year ?? ""} ${make} ${model}`.trim(),
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);
    const liters = Number(parsed.liters);
    if (!Number.isFinite(liters) || liters <= 0) {
      return res.status(422).json({ error: "Could not estimate tank capacity" });
    }
    res.json({ liters: Math.round(liters) });
  } catch {
    res.status(502).json({ error: "Tank capacity estimation failed" });
  }
});

// Cars
router.get("/cars", async (req, res) => {
  const userId = req.user!.id;
  const cars = await db
    .select()
    .from(carsTable)
    .where(eq(carsTable.userId, userId))
    .orderBy(desc(carsTable.createdAt));
  res.json(cars);
});

router.post("/cars", async (req, res) => {
  const userId = req.user!.id;
  const body = insertCarSchema.parse(req.body);
  const [car] = await db.insert(carsTable).values({ ...body, userId }).returning();
  res.status(201).json(car);
});

router.get("/cars/:carId", async (req, res) => {
  res.json(req.carAccess!.car);
});

router.put("/cars/:carId", async (req, res) => {
  const carId = parseInt(req.params.carId);
  if (!canMutateVehicle(req.carAccess!.role)) {
    return res.status(403).json({ error: "You do not have permission to edit this vehicle." });
  }
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
  if (!canMutateVehicle(req.carAccess!.role)) {
    return res.status(403).json({ error: "You do not have permission to delete this vehicle." });
  }
  await db.delete(carsTable).where(eq(carsTable.id, carId));
  res.json({ success: true });
});

// Upcoming maintenance (user's cars only)
router.get("/maintenance/upcoming", async (req, res) => {
  const userId = req.user!.id;
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
        usageUnit: carsTable.usageUnit,
      })
      .from(maintenanceTable)
      .innerJoin(carsTable, and(eq(maintenanceTable.carId, carsTable.id), eq(carsTable.userId, userId)))
      .orderBy(desc(maintenanceTable.id)), // latest first
    db.select().from(carsTable).where(eq(carsTable.userId, userId)),
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
        usageUnit: carsTable.usageUnit,
      })
      .from(inspectionsTable)
      .innerJoin(carsTable, and(eq(inspectionsTable.carId, carsTable.id), eq(carsTable.userId, userId)))
      .orderBy(desc(inspectionsTable.id)), // latest first
  ]);

  const licenseItems = buildLicenseItems(cars);
  const insuranceItems = buildInsuranceItems(cars);
  // Records are ordered by id DESC — first record per car+type is always the latest
  const maintenanceItems = buildMaintenanceItems(maintenanceRecords);
  // Records are ordered by id DESC — first record per car is always the latest
  const inspectionItems = buildInspectionItems(inspectionRecords);

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
  const { faultId: faultIdRaw, ...restBody } = req.body;
  const body = insertMaintenanceSchema.parse({ ...restBody, carId });
  const faultId = faultIdRaw !== undefined ? parseInt(faultIdRaw) : null;
  const record = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(maintenanceTable)
      .values({ ...body, createdByUserId: req.user!.id })
      .returning();
    if (faultId !== null && !isNaN(faultId)) {
      await tx.insert(eventCompletionsTable).values({ carId, recordType: "malfunction", recordId: faultId });
    }
    return inserted;
  });
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
  const [record] = await db
    .insert(partsTable)
    .values({ ...body, createdByUserId: req.user!.id })
    .returning();
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
  const [record] = await db
    .insert(insuranceTable)
    .values({ ...body, createdByUserId: req.user!.id })
    .returning();
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
  const [record] = await db
    .insert(dealershipsTable)
    .values({ ...body, createdByUserId: req.user!.id })
    .returning();
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
  const [record] = await db
    .insert(fuelTable)
    .values({ ...body, createdByUserId: req.user!.id })
    .returning();
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
router.get("/maintenance", async (req, res) => {
  const userId = req.user!.id;
  const [records, cars] = await Promise.all([
    db
      .select({ record: maintenanceTable })
      .from(maintenanceTable)
      .innerJoin(carsTable, and(eq(maintenanceTable.carId, carsTable.id), eq(carsTable.userId, userId)))
      .orderBy(desc(maintenanceTable.date)),
    db.select().from(carsTable).where(eq(carsTable.userId, userId)),
  ]);
  const carsMap = new Map(cars.map((c) => [c.id, c]));
  res.json(records.map(({ record: r }) => ({ ...r, car: carsMap.get(r.carId) ?? null })));
});

// All faults across all cars
router.get("/malfunctions", async (req, res) => {
  const userId = req.user!.id;
  const [records, completions, cars] = await Promise.all([
    db
      .select({ record: malfunctionsTable })
      .from(malfunctionsTable)
      .innerJoin(carsTable, and(eq(malfunctionsTable.carId, carsTable.id), eq(carsTable.userId, userId)))
      .orderBy(desc(malfunctionsTable.createdAt)),
    db.select().from(eventCompletionsTable).where(eq(eventCompletionsTable.recordType, "malfunction")),
    db.select().from(carsTable).where(eq(carsTable.userId, userId)),
  ]);
  const completedIds = new Set(completions.map((c) => c.recordId));
  const carsMap = new Map(cars.map((c) => [c.id, c]));
  res.json(records.map(({ record: r }) => ({
    ...r,
    completed: completedIds.has(r.id),
    car: carsMap.get(r.carId) ?? null,
  })));
});

// All inspections across all cars
router.get("/inspections", async (req, res) => {
  const userId = req.user!.id;
  const [records, cars] = await Promise.all([
    db
      .select({ record: inspectionsTable })
      .from(inspectionsTable)
      .innerJoin(carsTable, and(eq(inspectionsTable.carId, carsTable.id), eq(carsTable.userId, userId)))
      .orderBy(desc(inspectionsTable.createdAt)),
    db.select().from(carsTable).where(eq(carsTable.userId, userId)),
  ]);
  const carsMap = new Map(cars.map((c) => [c.id, c]));
  res.json(records.map(({ record: r }) => ({ ...r, car: carsMap.get(r.carId) ?? null })));
});

// All renewals across all cars
router.get("/renewals", async (req, res) => {
  const userId = req.user!.id;
  const [records, cars] = await Promise.all([
    db
      .select({ record: renewalsTable })
      .from(renewalsTable)
      .innerJoin(carsTable, and(eq(renewalsTable.carId, carsTable.id), eq(carsTable.userId, userId)))
      .orderBy(desc(renewalsTable.date)),
    db.select().from(carsTable).where(eq(carsTable.userId, userId)),
  ]);
  const carsMap = new Map(cars.map((c) => [c.id, c]));
  res.json(records.map(({ record: r }) => ({ ...r, car: carsMap.get(r.carId) ?? null })));
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
  const [record] = await db
    .insert(malfunctionsTable)
    .values({ ...body, createdByUserId: req.user!.id })
    .returning();
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
  const [record] = await db
    .insert(inspectionsTable)
    .values({ ...body, createdByUserId: req.user!.id })
    .returning();
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
  const renewals = await db.select().from(renewalsTable).where(eq(renewalsTable.carId, carId));

  const today = new Date().toISOString().split("T")[0];

  const licenseRenewals = renewals.filter((r) => r.type === "license");
  const insuranceRenewals = renewals.filter((r) => r.type === "insurance");

  const totalMaintenanceCost = maintenance.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalPartsCost = parts.reduce((s, r) => s + (r.cost ?? 0) * (r.quantity ?? 1), 0);
  const totalInsuranceCost =
    insurance.reduce((s, r) => s + (r.premium ?? 0), 0) +
    insuranceRenewals.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalLicenseCost = licenseRenewals.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalFuelCost = fuel.reduce((s, r) => s + (r.totalCost ?? 0), 0);

  const upcomingMaintenanceDue = maintenance.filter(
    (r) => r.nextDueDate && r.nextDueDate >= today
  );

  const recentActivity = [
    ...maintenance.map((r) => ({ type: "maintenance", description: r.description, date: r.date, cost: r.cost ?? null })),
    ...parts.map((r) => ({ type: "parts", description: r.name, date: r.installedDate ?? r.createdAt.toISOString().split("T")[0], cost: r.cost ?? null })),
    ...fuel.map((r) => ({ type: "fuel", description: `${r.liters}L fuel`, date: r.date, cost: r.totalCost })),
    ...dealerships.map((r) => ({ type: "dealership", description: `${r.name} - ${r.purpose}`, date: r.visitDate, cost: r.cost ?? null })),
    ...renewals.map((r) => ({
      type: r.type === "license" ? "license" : "insurance",
      description: r.type === "license"
        ? `License renewal${r.provider ? ` - ${r.provider}` : ""}`
        : `Insurance renewal${r.provider ? ` - ${r.provider}` : ""}`,
      date: r.date,
      cost: r.cost ?? null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const sortedMaintenance = [...maintenance].sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    car,
    totalMaintenanceCost,
    totalPartsCost,
    totalInsuranceCost,
    totalLicenseCost,
    totalFuelCost,
    totalCost: totalMaintenanceCost + totalPartsCost + totalInsuranceCost + totalLicenseCost + totalFuelCost,
    maintenanceCount: maintenance.length,
    partsCount: parts.length,
    fuelCount: fuel.length,
    licenseRenewalCount: licenseRenewals.length,
    insuranceRenewalCount: insuranceRenewals.length,
    lastMaintenance: sortedMaintenance[0]?.date ?? null,
    upcomingMaintenanceDue,
    recentActivity,
  });
});

// Renewals
router.post("/cars/:carId/renewals", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const parsed = insertRenewalSchema.safeParse({ ...req.body, carId });
  if (!parsed.success) return res.status(400).json({ error: "Invalid renewal data", details: parsed.error.flatten() });

  const [row] = await db
    .insert(renewalsTable)
    .values({ ...parsed.data, createdByUserId: req.user!.id })
    .returning();
  res.status(201).json(row);
});

router.get("/cars/:carId/renewals", async (req, res) => {
  const carId = parseInt(req.params.carId);
  const rows = await db
    .select()
    .from(renewalsTable)
    .where(eq(renewalsTable.carId, carId))
    .orderBy(desc(renewalsTable.date));
  res.json(rows);
});

export default router;
