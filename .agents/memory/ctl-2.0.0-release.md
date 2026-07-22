---
name: CTL 2.0.0 Release State
description: What was fixed and shipped for 2.0.0, and what remains as tech debt.
---

## Fixed / Shipped in 2.0.0

- SelectField web modal dead branch (`Platform.OS !== "android"` — was `=== "ios"`)
- SelectField: all TouchableOpacity → Pressable with accessibilityRole
- Reset token logged plaintext in production (auth.ts — now NODE_ENV-gated)
- Clerk session debug log on every sync-user call (clerkAuth.ts — now NODE_ENV-gated)
- Vite CVE GHSA-x574-m823-4x7w: bumped to 7.3.6 via workspace catalog
- fleet.tsx inline shadow* props: wrapped in Platform.select({ ios: ... })
- Fuel Log added to event/add.tsx picker (4th card, purple, droplet icon → /fuel)
- Global API rate limit: 300 req/min per IP in app.ts before /api router
- All package versions bumped 0.0.0 → 2.0.0

## Remaining Tech Debt (documented, not fixed)

- ~140 shadow* deprecation warnings in StyleSheet.create (web-only cosmetic)
- No ESLint config in either artifact (needs @expo/eslint-config for car-logbook, @typescript-eslint for api-server)
- 24 inline date formatting calls (should use lib/dateUtils.ts formatDate)
- repair-history.tsx (387 LOC) and history.tsx (435 LOC) share visual structure — candidate for shared EventTimeline component
- Rate limiting: per-route limits still missing on org/cars/maintenance routes (global baseline now covers them)
- 47 transitive dep vulnerabilities in Expo build chain (1 critical: shell-quote, not runtime)
- Clerk development keys — must switch to production Clerk keys before going live

**Why:** Durable record of 2.0.0 scope so future sessions don't re-audit the same items.

**How to apply:** Before starting a new task session, check this file to avoid re-doing already-fixed issues and to pick up known tech debt items efficiently.
