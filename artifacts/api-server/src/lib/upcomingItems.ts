export interface CarForUpcoming {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
  licenseValidUntil?: string | null;
  insuredUntil?: string | null;
  insuredWith?: string | null;
  usageUnit?: string | null;
}

export interface MaintenanceForUpcoming {
  carId: number;
  type: string;
  nextDueDate: string | null;
  nickname?: string | null;
  [key: string]: unknown;
}

export interface InspectionForUpcoming {
  id: number;
  carId: number;
  nextInspectionDate: string | null;
  place?: string | null;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  usageUnit?: string | null;
}

export function buildCarLabel(c: Pick<CarForUpcoming, "nickname" | "year" | "make" | "model">): string {
  return c.nickname ?? `${c.year} ${c.make} ${c.model}`;
}

export function buildLicenseItems(cars: CarForUpcoming[]) {
  return cars
    .filter((c) => c.licenseValidUntil)
    .map((c) => ({
      id: c.id,
      carId: c.id,
      itemKind: "license" as const,
      type: "License Expiry",
      description: `${buildCarLabel(c)}${c.licensePlate ? ` · ${c.licensePlate}` : ""}`,
      nextDueDate: c.licenseValidUntil!,
      nextDueMileage: null,
      make: c.make,
      model: c.model,
      year: c.year,
      nickname: c.nickname ?? null,
      usageUnit: c.usageUnit,
    }));
}

export function buildInsuranceItems(cars: CarForUpcoming[]) {
  return cars
    .filter((c) => c.insuredUntil)
    .map((c) => ({
      id: c.id,
      carId: c.id,
      itemKind: "insurance" as const,
      type: "Insurance Expiry",
      description: `${buildCarLabel(c)}${c.insuredWith ? ` · ${c.insuredWith}` : ""}`,
      nextDueDate: c.insuredUntil!,
      nextDueMileage: null,
      make: c.make,
      model: c.model,
      year: c.year,
      nickname: c.nickname ?? null,
      usageUnit: c.usageUnit,
    }));
}

export function buildMaintenanceItems<T extends MaintenanceForUpcoming>(maintenanceRecords: T[]) {
  const latestByCarType = new Map<string, T>();
  for (const r of maintenanceRecords) {
    const key = `${r.carId}::${r.type}`;
    if (!latestByCarType.has(key)) {
      latestByCarType.set(key, r);
    }
  }
  return Array.from(latestByCarType.values())
    .filter((r) => r.nextDueDate)
    .map((r) => ({
      ...r,
      itemKind: "maintenance" as const,
      nickname: r.nickname ?? null,
    }));
}

export function buildInspectionItems(inspectionRecords: InspectionForUpcoming[]) {
  const latestByCarId = new Map<number, InspectionForUpcoming>();
  for (const r of inspectionRecords) {
    if (!latestByCarId.has(r.carId)) {
      latestByCarId.set(r.carId, r);
    }
  }
  return Array.from(latestByCarId.values())
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
      usageUnit: r.usageUnit,
    }));
}
