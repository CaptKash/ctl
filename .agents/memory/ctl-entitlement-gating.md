---
name: CTL entitlement gating is client-only
description: Where Fleet/Enterprise access is actually enforced — and where it is NOT — in the car-logbook app.
---

# CTL Fleet/Enterprise gating is client-side

The personal `FREE_CAR_LIMIT` (2 cars) and premium-tool locks (PDF export, service costs, etc.) are enforced **only in the app UI**, driven by `isFleet`/`isEnterprise` from `useSubscription`. The api-server does **not** cap personal cars — `POST /cars` just inserts with no count check.

**Why it matters:** any "grant premium" perk (e.g. free Fleet for Enterprise members) can be done purely by flipping the client entitlement flags; no server enforcement change is needed for the base gating. Conversely, do NOT assume the server protects against over-limit writes — it doesn't.

**How to apply:** when changing who gets Fleet/Enterprise, edit the `isFleet`/`isEnterprise` derivation in `lib/revenuecat.tsx`. The server's RevenueCat check (`getEnterpriseSeatLimit`) is authoritative only for **org creation/seat growth**, not for personal-tier feature access.

**Perk in place:** active org members (`orgs.length > 0`) get Fleet free, including their personal garage; it auto-revokes when membership ends because `GET /orgs` only returns active memberships. This required `OrgProvider` to wrap `SubscriptionProvider` so `useSubscription` can read `useOrg().orgs`.
