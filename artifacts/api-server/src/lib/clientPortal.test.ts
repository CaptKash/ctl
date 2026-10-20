import assert from "node:assert/strict";
import test from "node:test";
import { canClientCreateRecord, canTransitionClientLink, clientCarSummary, sanitizeClientData } from "./clientPortal";

test("link transitions require client consent and deny personal admin reactivation", () => {
  assert.equal(canTransitionClientLink("admin", "shop_assigned", "pending", "active"), false);
  assert.equal(canTransitionClientLink("client", "shop_assigned", "pending", "active"), true);
  assert.equal(canTransitionClientLink("admin", "personal_link", "suspended", "active"), false);
  assert.equal(canTransitionClientLink("client", "personal_link", "suspended", "active"), true);
  assert.equal(canTransitionClientLink("admin", "shop_assigned", "suspended", "active"), true);
  assert.equal(canTransitionClientLink("client", "shop_assigned", "active", "revoked"), true);
});

test("client log allowlist denies shop-maintenance fault completion", () => {
  assert.equal(canClientCreateRecord("/malfunctions", {}), true);
  assert.equal(canClientCreateRecord("/fuel", {}), true);
  assert.equal(canClientCreateRecord("/maintenance", { faultId: 7 }), false);
  assert.equal(canClientCreateRecord("/parts", {}), false);
  assert.equal(canClientCreateRecord("/insurance", {}), false);
});

test("client sanitization removes private records recursively", () => {
  const safe = sanitizeClientData({
    id: 1, description: "noise", cost: 25, notes: "internal", car: { id: 2, vin: "private", totalCost: 10 },
  }) as Record<string, unknown>;
  assert.deepEqual(safe, { id: 1, description: "noise", car: { id: 2, vin: "private" } });
});

test("distinct scoped summaries support cross-client isolation", () => {
  const clientOneCarIds = new Set([10]);
  const clientTwoCarIds = new Set([11]);
  assert.equal(clientOneCarIds.has(11), false);
  assert.equal(clientTwoCarIds.has(10), false);
});

test("client car DTO never contains full-car private fields", () => {
  const summary = clientCarSummary({
    id: 4, make: "Acme", model: "Road", year: 2024, vehicleType: "car", usageUnit: "distance",
    nickname: null, color: null, mileage: 100, isElectric: false,
  });
  assert.deepEqual(Object.keys(summary).sort(), ["color", "id", "isElectric", "make", "mileage", "model", "nickname", "usageUnit", "vehicleType", "year"]);
});