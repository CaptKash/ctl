---
name: sync-user stale clerkUserId auto-relink
description: How sync-user handles users migrated from a retired Clerk tenant, and what caused the auto sign-out bug.
---

# sync-user stale clerkUserId auto-relink

## The rule
When sync-user finds an email in the DB linked to a **different** clerkUserId, it now checks whether that old clerkUserId still exists in the current Clerk instance (via `CLERK_LOOKUP_SECRET_KEY`). If the old ID returns 404 **and** the incoming email is verified, the row is re-linked to the new clerkUserId and a 200 is returned. Only a live 200 from the old-ID lookup forces a 409.

**Why:** After migrating from a retired Replit-managed Clerk tenant to charmed-garfish-1, all production users had stale clerkUserIds in the DB. The 409 guard was correct for security but had no escape valve for legitimate migration re-links.

**How to apply:** Any time sync-user returns 409 for a user you expect to be valid, check whether their `clerk_user_id` in the DB is from the old Replit-managed tenant. The auto-relink should handle it on next sign-in. If the old ID still exists in Clerk (returns 200), the 409 is legitimate.

## Root cause chain for the auto sign-out bug
1. `POST /api/auth/clerk/sync-user` was failing → mobile retries 5× then calls `clerk.signOut()`
2. Initially: `@clerk/express` JWKS network fetches timed out on cold start → `userId: null` → fixed with `CLERK_JWT_KEY`
3. Then: `clerkApi(/users/${id})` returned 404 → fixed by adding `CLERK_LOOKUP_SECRET_KEY` (separate from `CLERK_SECRET_KEY` which production deployment overrides with `sk_live`)
4. Then: email found in production DB with old clerkUserId from retired tenant → 409 → fixed with auto-relink

## Key secrets
- `CLERK_LOOKUP_SECRET_KEY` — charmed-garfish-1 **dev** `sk_test_...` key; used exclusively for user lookups. Never set a production-specific override for this key or it will break migration relinks.
- `CLERK_SECRET_KEY` — overridden in Replit deployment environment with `sk_live_3jDAtMb` (charmed-garfish-1 production instance). Do not rely on this for user lookups in the dev-built TestFlight app.
- `CLERK_JWT_KEY` — RSA public key for local JWT verification; avoids JWKS network fetch on cold start.
- `CLERK_EXPECTED_ISSUER` — non-secret env var set to `https://charmed-garfish-1.clerk.accounts.dev`; hard-gates requests to tokens from the correct Clerk instance.

## Production DB vs dev DB
The Replit deployment connects to the **production database** (separate from what `executeSql({ environment: "development" })` queries). Do not assume a dev-DB fix carries over — always use `executeSql({ environment: "production" })` to inspect production data, and use the API or a migration path to write to it (production DB is read-only via executeSql).
