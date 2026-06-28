---
name: CTL Enterprise subscription model
description: How Enterprise entitlements map to accounts/orgs today, and the planned future direction.
---

Today the Enterprise entitlement is bound to the **user account**, not to an organization:
- RevenueCat customer = the user's id. A user has one entitlement state; the app/server collapse it to the **single most generous active tier** (unlimited > 50 > 10).
- An org's seat limit is re-derived from its **owner's** single entitlement at create/refresh time. There is no per-org subscription.
- Enterprise ⊇ Fleet: `isFleet` is true whenever `isEnterprise` (Enterprise includes all Fleet features; admin/test accounts get both).
- No guard stops a user owning multiple orgs, so today one subscription would back every org that user owns, each at the full seat cap (a known loophole — not enforced).

**Planned future (product owner intent, NOT to build yet):** allow a user to hold **multiple Enterprise subscriptions, one per organization**.

**Why:** product owner explicitly deferred this as "too early" — for now keep one-subscription-per-account.

**How to apply:** don't deepen hard-to-reverse coupling that assumes account=one-entitlement (e.g. avoid baking the single-most-generous-tier collapse into more places, or adding a permanent one-org-per-owner guard) without checking this roadmap. The exclusivity rule (an account must not combine personal/fleet AND enterprise) was also intentionally left unenforced.
