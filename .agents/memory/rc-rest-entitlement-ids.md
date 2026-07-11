---
name: RevenueCat REST v2 active-entitlement id vs lookup_key
description: The REST active-entitlements endpoint returns entitlement OBJECT ids, not lookup keys — must translate server-side.
---

# RevenueCat REST v2 active entitlements return object ids, not lookup keys

`listCustomerActiveEntitlements` (REST v2, used by the api-server) returns each
item's `entitlement_id` as the entitlement **object id** (e.g. `entlb80aa2449c`),
NOT the human lookup key (e.g. `enterprise_unlimited`).

**Why this bites:** the mobile RN SDK (`Purchases.getCustomerInfo()`) keys
`entitlements.active` by lookup key, so the client gates correctly. Server code
that reuses the same lookup-key map against the REST response silently matches
nothing → false "no active subscription" (403) for genuinely subscribed users.

**How to apply:** on the server, build an id→lookup_key map via
`listEntitlements` and translate `entitlement_id` before comparing against any
lookup-key map (e.g. `ENTERPRISE_ENTITLEMENTS`). Cache per project, and
refresh-on-miss (re-fetch once if an active id isn't in the cached map) so newly
created entitlement tiers don't require a process restart.
