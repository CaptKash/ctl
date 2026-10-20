import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateOwnedOrganization,
  countOccupiedSeats,
  countActiveSeats,
  decideSeatGrowth,
  isRoleAllowedForOrganization,
  isSeatMembership,
  previewRepairShopConversion,
} from "./organizationSeats";

test("one subscription can own one enterprise while memberships remain unrelated", () => {
  assert.equal(canCreateOwnedOrganization(0), true);
  assert.equal(canCreateOwnedOrganization(1), false);
  assert.equal(canCreateOwnedOrganization(12), false);
});

test("fleet seats are active or invited admins and staff only", () => {
  const members = [
    { role: "admin", status: "active" },
    { role: "staff", status: "invited" },
    { role: "client", status: "active" },
    { role: "staff", status: "rejected" },
    { role: "admin", status: "removed" },
  ];
  assert.equal(countOccupiedSeats("fleet", members), 2);
  assert.equal(isSeatMembership("fleet", { role: "client", status: "invited" }), false);
});

test("repair-shop seats are active or invited clients, never the owner admin", () => {
  const members = [
    { role: "admin", status: "active" },
    { role: "client", status: "invited" },
    { role: "client", status: "active" },
    { role: "client", status: "rejected" },
    { role: "staff", status: "active" },
  ];
  assert.equal(countOccupiedSeats("repair_shop", members), 2);
  assert.equal(isSeatMembership("repair_shop", { role: "client", status: "removed" }), false);
});

test("accepting a valid reserved invite does not consume a second seat", () => {
  const before = [
    { role: "admin", status: "active" }, // repair-shop owner, not a client seat
    { role: "client", status: "invited" },
  ];
  const after = [
    { role: "admin", status: "active" },
    { role: "client", status: "active" },
  ];
  assert.equal(countOccupiedSeats("repair_shop", before), 1);
  assert.equal(countOccupiedSeats("repair_shop", after), 1);
  assert.equal(isRoleAllowedForOrganization("repair_shop", "admin"), false);
});

test("projected active-seat decisions cover cancellation, downgrades, and reserved acceptance", () => {
  const members = [
    { role: "admin", status: "active" },
    { role: "client", status: "active" },
    { role: "client", status: "invited" },
  ];
  // The reservation is occupied, but accepting it projects from active usage.
  assert.equal(countOccupiedSeats("repair_shop", members), 2);
  assert.equal(countActiveSeats("repair_shop", members), 1);
  assert.equal(decideSeatGrowth(true, 1, 2), "allow");
  assert.equal(decideSeatGrowth(true, 1, 1), "limit_reached"); // downgrade
  assert.equal(decideSeatGrowth(true, 1, undefined), "no_entitlement"); // cancellation
  assert.equal(decideSeatGrowth(false, 1, undefined), "allow");
});

test("seat decision is safe for concurrent locked writers", () => {
  // Once one writer has committed, a second writer observes currentSeats = 2
  // under the org row lock and is denied rather than over-allocating.
  assert.equal(decideSeatGrowth(true, 1, 2), "allow");
  assert.equal(decideSeatGrowth(true, 2, 2), "limit_reached");
  assert.equal(decideSeatGrowth(true, 0, undefined), "no_entitlement");
});

test("repair shops reserve admin for their owner and otherwise only permit clients", () => {
  assert.equal(isRoleAllowedForOrganization("repair_shop", "client"), true);
  assert.equal(isRoleAllowedForOrganization("repair_shop", "admin"), false);
  assert.equal(isRoleAllowedForOrganization("repair_shop", "admin", true), true);
  assert.equal(isRoleAllowedForOrganization("repair_shop", "staff", true), false);
  assert.equal(isRoleAllowedForOrganization("fleet", "staff"), true);
});

test("repair-shop conversion preview blocks invalid staff and client overages", () => {
  const members = [
    { userId: 1, role: "admin", status: "active" },
    { userId: 2, role: "staff", status: "invited" },
    { userId: 3, role: "client", status: "active" },
    { userId: null, role: "client", status: "invited" },
    { userId: 4, role: "staff", status: "removed" },
  ];
  assert.deepEqual(previewRepairShopConversion(members, 1, 1), {
    currentOccupiedSeats: 2,
    repairShopOccupiedSeats: 2,
    seatLimit: 1,
    staffMemberships: 1,
    clientOverage: 1,
    canConvert: false,
  });
  assert.equal(previewRepairShopConversion(
    members.filter((member) => member.userId !== 2),
    1,
    2,
  ).canConvert, true);
  assert.equal(previewRepairShopConversion([], 1, undefined).canConvert, false);
});