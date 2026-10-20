/**
 * Policies shared by the client portal routes. Keeping these pure makes the
 * security boundary testable without a database or Express request.
 */
export type ClientLinkStatus = "pending" | "active" | "rejected" | "revoked" | "suspended";
export type ClientLinkType = "shop_assigned" | "personal_link";

export function canTransitionClientLink(
  actor: "admin" | "client",
  type: ClientLinkType,
  from: ClientLinkStatus,
  to: ClientLinkStatus,
): boolean {
  if (actor === "admin") {
    if (to === "suspended" || to === "revoked") return from !== "revoked";
    // Shop assignments are explicitly accepted by a client first. An admin
    // may only restore an already accepted shop assignment from suspension.
    return type === "shop_assigned" && from === "suspended" && to === "active";
  }
  // A client controls consent for their own link. They may accept a pending
  // request, restore their own non-active personal link, or withdraw consent.
  if (to === "revoked") return from !== "revoked";
  if (to === "rejected") return from === "pending";
  if (to === "active") {
    return type === "shop_assigned" ? from === "pending" : from !== "active";
  }
  return false;
}

/** Customer-originated records clients are allowed to add to assigned cars. */
export function canClientCreateRecord(path: string, _body: unknown): boolean {
  if (path === "/malfunctions" || path === "/fuel" || path === "/inspections" || path === "/renewals") return true;
  // Maintenance is intentionally excluded: it can close a fault and contains
  // shop costs/parts. In particular no client supplied faultId is accepted.
  return false;
}

const privateKey = /cost|premium|supplier|notes|bill|warranty|shopaddress|shopphone|agent|contact|policynumber|deductible|coveragelimit|totalmaintenance|totalparts|totalinsurance|totallicense|totalfuel|totalcost/i;

/** Recursively remove financial and operational-private fields for shop clients. */
export function sanitizeClientData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeClientData);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !privateKey.test(key))
      .map(([key, child]) => [key, sanitizeClientData(child)]),
  );
}

export function clientCarSummary(car: { id: number; make: string; model: string; year: number; vehicleType: string; usageUnit: string; nickname: string | null; color: string | null; mileage: number | null; isElectric: boolean }) {
  return { id: car.id, make: car.make, model: car.model, year: car.year, vehicleType: car.vehicleType, usageUnit: car.usageUnit, nickname: car.nickname, color: car.color, mileage: car.mileage, isElectric: car.isElectric };
}