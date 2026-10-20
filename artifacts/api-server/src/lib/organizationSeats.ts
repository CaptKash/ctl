/**
 * Pure organization membership policy.  Keep seat accounting here so invites,
 * acceptance, role edits, and entitlement refreshes cannot drift apart.
 */
export type OrganizationType = "fleet" | "repair_shop";
export type OrganizationRole = "admin" | "staff" | "client";
export type OrganizationMemberStatus = "invited" | "active" | "rejected" | "removed" | string;

export type SeatMembership = {
  id?: number;
  userId?: number | null;
  role: string;
  status: string;
};

export type RepairShopConversionPreview = {
  currentOccupiedSeats: number;
  repairShopOccupiedSeats: number;
  seatLimit: number | null | undefined;
  staffMemberships: number;
  clientOverage: number;
  canConvert: boolean;
};

const occupiedStatuses = new Set<OrganizationMemberStatus>(["invited", "active"]);

/** One Enterprise subscription may own one organization at a time. */
export function canCreateOwnedOrganization(existingOwnedOrganizations: number): boolean {
  return existingOwnedOrganizations === 0;
}

export function isSeatMembership(
  organizationType: OrganizationType,
  member: SeatMembership,
): boolean {
  if (!occupiedStatuses.has(member.status)) return false;
  return organizationType === "fleet"
    ? member.role === "admin" || member.role === "staff"
    : member.role === "client";
}

export function countOccupiedSeats(
  organizationType: OrganizationType,
  members: readonly SeatMembership[],
): number {
  return members.reduce((count, member) => count + Number(isSeatMembership(organizationType, member)), 0);
}

/** Only active memberships matter when an invitation is about to activate. */
export function countActiveSeats(
  organizationType: OrganizationType,
  members: readonly SeatMembership[],
): number {
  return countOccupiedSeats(organizationType, members.filter((member) => member.status === "active"));
}

/** Build the same Fleet → Repair Shop safety check used by preview and commit. */
export function previewRepairShopConversion(
  members: readonly SeatMembership[],
  ownerUserId: number,
  seatLimit: number | null | undefined,
): RepairShopConversionPreview {
  const staffMemberships = members.filter((member) =>
    occupiedStatuses.has(member.status)
    && member.userId !== ownerUserId
    && (member.role === "admin" || member.role === "staff")
  ).length;
  const repairShopOccupiedSeats = countOccupiedSeats("repair_shop", members);
  const clientOverage = seatLimit == null
    ? 0
    : Math.max(0, repairShopOccupiedSeats - seatLimit);
  return {
    currentOccupiedSeats: countOccupiedSeats("fleet", members),
    repairShopOccupiedSeats,
    seatLimit,
    staffMemberships,
    clientOverage,
    canConvert: seatLimit !== undefined && staffMemberships === 0 && clientOverage === 0,
  };
}

export type SeatDecision = "allow" | "no_entitlement" | "limit_reached";

/**
 * Decide a seat-bearing mutation from a locked snapshot. `undefined` means
 * the owner's entitlement is absent; null means unlimited.
 */
export function decideSeatGrowth(
  seatBearing: boolean,
  currentSeats: number,
  freshLimit: number | null | undefined,
): SeatDecision {
  if (!seatBearing) return "allow";
  if (freshLimit === undefined) return "no_entitlement";
  if (freshLimit === null || currentSeats + 1 <= freshLimit) return "allow";
  return "limit_reached";
}

/** Repair shops have one administrative owner; all other members are clients. */
export function isRoleAllowedForOrganization(
  organizationType: OrganizationType,
  role: string,
  isOwner = false,
): role is OrganizationRole {
  if (organizationType === "fleet") return role === "admin" || role === "staff" || role === "client";
  return role === "client" || (isOwner && role === "admin");
}