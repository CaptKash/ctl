import { createClient } from "@replit/revenuecat-sdk/client";
import { listCustomerActiveEntitlements, listEntitlements } from "@replit/revenuecat-sdk";

// Per-tier CTL Enterprise entitlements, configured in the RevenueCat dashboard.
// Each tier's monthly + annual products both unlock the same entitlement, so
// the seat limit is derived directly from the active entitlement id — no
// fragile product-id resolution required. `null` = unlimited seats.
export const ENTERPRISE_ENTITLEMENTS: Record<string, number | null> = {
  enterprise_10: 10,
  enterprise_50: 50,
  enterprise_unlimited: null,
};

// Cached RevenueCat connector credentials (refreshed when expired).
let connectionSettings: { settings?: Record<string, any> } | undefined;

async function getApiKey(): Promise<string> {
  if (
    connectionSettings?.settings?.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;
  if (!xReplitToken) throw new Error("X-Replit-Token not found for repl/depl");

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=revenuecat",
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } },
  )
    .then((r) => r.json())
    .then((d: any) => d.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error("RevenueCat not connected");
  return accessToken;
}

async function getClient() {
  const apiKey = await getApiKey();
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: { Authorization: "Bearer " + apiKey },
  });
}

// The active-entitlements REST endpoint returns each entitlement's object id
// (e.g. "entlb80aa2449c"), NOT its lookup key ("enterprise_unlimited"). Cache a
// map from object id → lookup key (per project) so we can match against
// ENTERPRISE_ENTITLEMENTS. Refreshed on demand when an unknown id is seen, so
// newly-created entitlements don't require a process restart.
const entitlementLookupCache = new Map<string, Record<string, string>>();

async function getEntitlementLookupById(
  client: ReturnType<typeof createClient>,
  projectId: string,
  forceRefresh = false,
): Promise<Record<string, string>> {
  if (!forceRefresh) {
    const cached = entitlementLookupCache.get(projectId);
    if (cached) return cached;
  }
  const { data, error } = await listEntitlements({
    client,
    path: { project_id: projectId },
    query: { limit: 100 },
  });
  if (error) throw new Error("Failed to fetch RevenueCat entitlements");
  const map: Record<string, string> = {};
  for (const e of data?.items ?? []) map[e.id] = e.lookup_key;
  entitlementLookupCache.set(projectId, map);
  return map;
}

export type EntitlementUser = { id: number; isAdmin?: boolean };

/**
 * Resolve the Enterprise seat limit a user is entitled to, from RevenueCat —
 * the source of truth. NEVER trust a seat limit supplied by the client.
 *   • number    → finite seat limit of the active tier
 *   • null      → unlimited (active unlimited tier, or admin test account)
 *   • undefined → no active Enterprise entitlement (cannot create/grow an org)
 * Throws if RevenueCat cannot be reached so callers can fail closed.
 */
export async function getEnterpriseSeatLimit(
  user: EntitlementUser,
): Promise<number | null | undefined> {
  // Owner/admin acts as an unlimited Enterprise account for testing, mirroring
  // the client (isAdmin grants Fleet/Enterprise). No purchase or RC call.
  if (user.isAdmin) return null;

  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) throw new Error("REVENUECAT_PROJECT_ID is not set");

  const client = await getClient();
  const { data, error } = await listCustomerActiveEntitlements({
    client,
    path: { project_id: projectId, customer_id: String(user.id) },
  });
  if (error) throw new Error("Failed to fetch RevenueCat entitlements");

  const activeItems = (data?.items ?? []).filter(
    (e) => e.expires_at == null || e.expires_at > Date.now(),
  );

  let lookupById = await getEntitlementLookupById(client, projectId);
  // If a currently-active entitlement id isn't in the cached map, the map is
  // stale (e.g. a new tier was just created) — refresh once before matching.
  if (activeItems.some((e) => !(e.entitlement_id in lookupById))) {
    lookupById = await getEntitlementLookupById(client, projectId, true);
  }

  let limit: number | null | undefined = undefined;
  for (const e of activeItems) {
    // The REST endpoint returns entitlement object ids; map to lookup keys.
    const lookupKey = lookupById[e.entitlement_id];
    if (!lookupKey || !(lookupKey in ENTERPRISE_ENTITLEMENTS)) continue;
    const tier = ENTERPRISE_ENTITLEMENTS[lookupKey];
    // Most generous active tier wins; unlimited beats any finite limit.
    if (tier === null) return null;
    limit = limit === undefined ? tier : Math.max(limit, tier);
  }
  return limit;
}
