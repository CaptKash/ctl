# Clerk Migration Plan — Build 28

Status: **Phase 0 in progress.** Schema column added, SDKs installed, Clerk Auth-pane setup pending user action.
Strategy: **Lazy / just-in-time migration** (Option A from the rollout discussion).
Constraint: Production sees new signups daily — zero-downtime, zero-orphan migration required.

**Runtime preflight (verified):** API server runs Node v24.13.0; `@clerk/express` requires `>=20.9.0` ✅.

**Phase 2 spike still owed:** confirm Clerk Backend API accepts importing existing bcrypt password hashes (`password_digest` + `password_hasher: "bcrypt"` per current Clerk docs). Owning this assumption is the highest single risk in the lazy-migration design — if Clerk rejects pre-hashed bcrypt at our cost factor, `/auth/clerk/migrate` falls back to a forced password-reset flow on first login. Spike happens at the start of Phase 2, not now.

---

## Goal

Replace the custom email/password + JWT auth stack with **Replit-managed Clerk** so that:
- Apple sign-in and Google sign-in work end-to-end (currently silent no-ops on the signup screen)
- Email verification is enforced for new accounts
- The 71 existing prod users keep working without ever being forced to reset their password
- Their RevenueCat fleet entitlements survive the migration intact
- New signups that arrive *during* the rollout are not orphaned

---

## Why "lazy migration" and not bulk import

A bulk import (snapshot the `users` table → push into Clerk → ship) creates an orphan window from the day of import to the day TestFlight launches. With daily signups + Apple review (24–48h), this window is days, and any user who signs up inside it would be locked out of the new build. Lazy migration eliminates the orphan window entirely.

---

## Source-of-truth contract (the most important decision)

After the migration:

- **Our `users` table remains the source of truth** for `id`, `name`, `email`, `country`, `is_admin`, `password_upgrade_required`, foreign-key relationships to `cars` / `maintenance` / `password_reset_tokens` / etc.
- **Clerk is the source of truth for credentials only** — what password they have, which OAuth providers they've linked, whether their email is verified, session tokens.
- A new column `users.clerk_user_id text unique` links the two. `NULL` means "not yet migrated" (still on legacy bcrypt auth).
- **`users.id` (the numeric serial) never changes** — this is what RevenueCat already uses as `appUserID`, what every foreign key already references, and what every existing JWT encodes.

This contract is what makes the migration safe: nothing downstream of auth (subscriptions, cars, maintenance, admin checks) needs to know Clerk exists.

---

## Schema changes

Single column add:

```ts
// lib/db/src/schema/cars.ts — usersTable
clerkUserId: text("clerk_user_id"), // unique, nullable
```

Plus a unique index `users_clerk_user_id_unique` on it. Default `NULL`. No backfill needed — gets populated lazily as users migrate.

That's it. No other schema changes required.

---

## Rollout phases

### Phase 0 — Prep (no user impact)

1. Set up Replit-managed Clerk via the Auth pane in workspace
2. Configure Apple + Google OAuth providers in the Auth pane (Replit handles the Apple Service ID / Google client setup; we just enable them)
3. Add the `clerk_user_id` column to dev DB via `pnpm db push`
4. Install `@clerk/clerk-expo` in `artifacts/car-logbook` and `@clerk/express` in `artifacts/api-server`

### Phase 1 — Server-side dual auth (no app changes)

The API server learns to accept *either* a legacy JWT (existing 71 users) *or* a Clerk session token, on every protected route.

`requireAuth` middleware becomes:
```
1. Read Authorization header
2. If "Bearer eyJ..." with our JWT format → validate as legacy JWT → req.user = legacy user
3. Else if Clerk session token → validate via Clerk → look up local user by clerkUserId → req.user = local user
4. Else 401
```

Both paths populate `req.user` with the same shape the rest of the app already expects (numeric `id`, `email`, `isAdmin`). Downstream code is unchanged.

This phase is invisible to users — no one is logging in via Clerk yet.

### Phase 2 — New endpoints for Clerk-based flows

Add three new routes (legacy `/auth/*` routes stay live):

- `POST /auth/clerk/sync-user` — called by the new mobile app after a successful Clerk sign-in. Takes a Clerk session token, finds-or-creates the matching row in our `users` table, returns the local user object (`id`, `name`, `email`, `isAdmin`, `passwordUpgradeRequired`).
  - **Lookup order**: by `clerk_user_id` first, then by `email` (the migration-on-first-login case).
  - When matching by email, set `clerk_user_id` on that row → user is now permanently linked.
  - When neither matches (brand-new signup via Clerk), insert a new row.

- `POST /auth/clerk/migrate` — called by the new app on legacy users' first Clerk login attempt. Takes their email + the password they typed into the new login form. Server validates against the legacy bcrypt hash; if valid, it programmatically creates them in Clerk via the Clerk Backend API (preserving the bcrypt hash so they don't notice anything), sets `clerk_user_id` on their row, and returns success. The app then has them sign in to Clerk normally.
  - This is the magic step. From the user's POV they just typed their old password into the new login screen and it worked. Behind the scenes we silently moved them into Clerk.

- (Optional) `POST /auth/clerk/link` — for users who want to add Apple/Google to their existing email account from settings.

#### Phase 2 — shipped

Implemented in `artifacts/api-server/src/routes/clerkAuth.ts`, wired in `routes/index.ts`. Architect-reviewed and hardened. Highlights:

- **Spike confirmed**: Clerk Backend API accepts `$2b$10$` digests via `password_digest` + `password_hasher: "bcrypt"`. POST /v1/users → POST /v1/users/{id}/verify_password returns `verified:true` for the original password, `incorrect_password` for wrong. The lazy-migration design is viable.
- **Sentinel `__CLERK_MANAGED__`** stored in `users.password_hash` for Clerk-native rows (no schema migration needed; bcrypt.compare always fails it). Phase 4 drops the column entirely.
- **`/auth/clerk/sync-user`** is gated by Clerk session via local `requireClerkSession` middleware. Lookup order: by `clerk_user_id` (idempotent fast path) → by email (legacy match → link) → insert. Race-safe: linking is `WHERE id=? AND clerk_user_id IS NULL`; SQLSTATE 23505 on insert re-reads by clerkUserId.
- **Email-verification gate (security)**: linking a pre-existing local row to a Clerk identity requires Clerk's primary email `verification.status === "verified"`. Without this, an attacker could claim a victim's account by signing up an unverified Clerk session with the victim's email.
- **`/auth/clerk/migrate`** is unauthenticated by design (the user has no Clerk session yet). bcrypt-compare against the local hash; if valid, import the same hash into Clerk preserving the password, mark email verified (admin strategy, warn-only on failure), set `clerk_user_id`. Generic 401 on missing-account / wrong-password / sentinel-account (no enumeration).
- **Idempotent on Clerk-side conflict**: if Clerk POST /users returns 422/400 with `form_identifier_exists`, we look up the existing Clerk user by email and link it instead of failing with 502. Handles partial-failure retries cleanly.
- **Rate-limited**: in-memory per-(IP, email) limiter — 5 attempts per 15 min, 429 thereafter. Single-process; if api-server ever scales horizontally, must move to Redis.
- **Legacy routes are now Clerk-aware** (`routes/auth.ts` `isClerkManaged()` helper):
  - `/auth/login` returns generic 401 for migrated/Clerk-native rows (so a stale legacy JWT path can't keep minting tokens alongside Clerk and drift).
  - `/auth/change-password` returns 409 for Clerk-managed rows (must change via Clerk so hashes don't diverge).
  - `/auth/forgot-password` silently skips token issuance + email send for Clerk-managed rows (still returns the same opaque success message — no enumeration leak).
  - `/auth/reset-password` re-checks the target user at submit time and refuses with the same "invalid or expired" error if the user migrated after the link was generated.

E2E verified end-to-end: register → migrate → Clerk verify_password 200 verified → email verified → 2nd-call 409 alreadyMigrated → wrong-pw 401 → /auth/login on migrated user 401 → /auth/forgot-password silent → /auth/reset-password with valid pre-migration token rejected (hash unchanged, token still unused) → Clerk-side duplicate triggers lookup-and-link recovery → 6th rate-limit attempt 429.

### Phase 3 — New TestFlight build

Mobile app changes:
- Login screen: tries Clerk sign-in first. On failure with "user not found in Clerk," call `/auth/clerk/migrate`, then retry Clerk sign-in. Net UX: same login form, same password, no visible difference for the 71 existing users.
- Signup screen: the existing strict-rules form now creates the account directly in Clerk (with email verification step), then calls `/auth/clerk/sync-user` to mirror it locally.
- Apple / Google buttons: now functional via Clerk's OAuth flows.
- AuthContext: instead of storing our JWT, stores the Clerk session and asks Clerk for the current user. Then calls `/auth/clerk/sync-user` to get the local user object (which is what every other screen reads).
- API requests: Authorization header now uses Clerk session token instead of our JWT. The dual-auth middleware (Phase 1) accepts either, so this is a clean swap.

### Phase 4 — Cleanup (weeks later, separate build)

Once all 71 users have logged in at least once and `clerk_user_id` is populated for them (we'll have a query to check):
- Drop the legacy JWT path from `requireAuth`
- Remove `/auth/login`, `/auth/register`, `/auth/me`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password` (mobile no longer calls them)
- Remove `passwordHash` and `passwordUpgradeRequired` columns from `users` table
- Remove `password_reset_tokens` table
- Remove the `PasswordUpgradeModal` (no longer relevant — Clerk handles password policies)

For users who never log in (estimated <5 of the 71), leave them with `clerk_user_id = NULL` indefinitely. They effectively become dormant accounts. We can email them later if needed.

---

## RevenueCat preservation strategy

This is the highest-risk part of the migration because subscription revenue is at stake.

**Current behavior** (`lib/revenuecat.tsx:148`):
```ts
Purchases.logIn(String(user.id))
```
RevenueCat's `appUserID` for the 71 users is their numeric `users.id` (e.g. `"11"`, `"13"`, `"14"`).

**After migration**: keep using `String(user.id)` exactly as today. Because we never change the numeric `id` (only add `clerk_user_id` alongside it), every existing user's `appUserID` in RevenueCat stays identical. Their entitlements transfer with zero RevenueCat-side changes.

**For new Clerk-native signups**: same code path — `/auth/clerk/sync-user` returns a user object with our local numeric `id`, and the RevenueCat hook calls `Purchases.logIn(String(user.id))` with that.

**Verification gate before TestFlight ships**: write a quick script that picks 3 of the 7 dev test accounts, runs them through the full migration flow, and confirms their RevenueCat customer info (entitlements + subscription status) is unchanged.

---

## Rollback plan

Each phase is independently revertible:

- **Phase 1 (dual-auth middleware)**: revert the middleware change → server only accepts legacy JWTs again. New build app keeps working because it falls back to `/auth/clerk/migrate` which keeps validating against bcrypt hashes.
- **Phase 2 (new endpoints)**: leaving these live is harmless — they're only called by the new app build.
- **Phase 3 (new TestFlight build)**: if catastrophic, expire the TestFlight build / pull from review. Users on the old build continue working through legacy auth (which is still live).
- **Phase 4 (cleanup)**: don't do this until Phase 3 has been stable in TestFlight + App Store for 2+ weeks. Easily skipped/delayed.

---

## Open questions — resolved

1. **Clerk Apple sign-in setup**: Replit-managed Clerk handles OAuth provider config; user enables Google + Apple in the Auth pane during Phase 0. End-to-end Apple sign-in to be verified during Phase 3 dev-build testing.
2. **Email verification for the 71 existing users**: ✅ **Decision: mark as already-verified** when we silently migrate them via `/auth/clerk/migrate`. They've proven ownership through months of working forgot-password flows. (User confirmed.)
3. **Clerk MAU pricing**: Replit-managed Clerk — pricing handled at the Replit subscription tier level. Will check current limits before Phase 3 ship.
4. **Prod test account cleanup**: ✅ **Decision: clean before Phase 3** (queued, not done yet). Targets: `testuser@example.com`, the two Test-icloud accounts, `mkashour@gmail.com (Test)`, `mkashour@icloud.com`. **Excluded (keep)**: `mkashour.apple@gmail.com` (admin, prod user id 11). Agent's `executeSql` is read-only against prod, so the actual delete will be done either via a one-shot admin endpoint triggered manually or via the Publish-time SQL window.

## Phase 0 status — complete

- [x] `clerk_user_id text unique nullable` column added to dev DB + schema file (`lib/db/src/schema/cars.ts`)
- [x] `@clerk/clerk-expo` installed in `artifacts/car-logbook`
- [x] `@clerk/express` installed in `artifacts/api-server`
- [x] Replit-managed Clerk provisioned (`setupClerkWhitelabelAuth`); status now `managed`. `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` set as Replit secrets.

## Phase 1 status — complete

- [x] `clerkMiddleware()` mounted in `artifacts/api-server/src/app.ts` (gated on env presence — safe in environments without Clerk keys).
- [x] `requireAuth` and `optionalAuth` in `artifacts/api-server/src/middlewares/auth.ts` rewritten as dual-auth: try legacy JWT first (in-memory verify, cheap), fall back to Clerk session via `getAuth(req)` + `usersTable.clerkUserId` lookup. Single `AuthPayload` shape returned to handlers — credential-agnostic.
- [x] `/auth/me` route migrated to use `requireAuth` instead of inline JWT verification (response shape unchanged).
- [x] Smoke-tested against running API (port 8080):
  - Valid legacy JWT → 200 with full user object ✅
  - Missing Authorization header → 401 ✅
  - Garbage Bearer token → 401 (no crash) ✅
  - Valid signature, unknown user id → 404 from `/auth/me` (auth layer correctly delegated to handler) ✅
  - `/healthz` (no auth) → 200 ✅
- [x] No new TypeScript errors introduced (15 pre-existing errors in `cars.ts` are out of scope).

Phase 1 is invisible to all users — no mobile app changes, no behavior change for the 71 existing accounts. The API is now *ready* to accept Clerk sessions but no real one will appear until Phase 3 ships.

### Phase 1 hardening (post-architect review)

The first architect review (FAIL) flagged three issues; all addressed in-band before declaring Phase 1 done:

1. **Hardcoded JWT_SECRET fallback removed.** Both `middlewares/auth.ts` and `routes/auth.ts` now require `process.env.JWT_SECRET` and throw at boot if missing. `JWT_SECRET` set as a Replit shared-env var to the current literal value (`ctl-logbook-secret-2025`) so all 71 existing user tokens remain valid. **Deferred follow-up:** rotate `JWT_SECRET` to a fresh strong value AFTER Phase 3 ships and legacy JWTs are no longer accepted (rotating now would log everyone out on the old login UI). This is the only intentionally-deferred item.
2. **Clerk-path error handling narrowed.** `authenticate()` now only swallows the specific "clerkMiddleware not mounted" error; DB outages or other runtime errors propagate to the outer `requireAuth` try/catch and return 500 instead of a misleading 401.
3. **Loud warning when Clerk keys absent.** `app.ts` logs `[auth] CLERK_SECRET_KEY/CLERK_PUBLISHABLE_KEY not set — Clerk auth is disabled` at boot if either env var is missing.

Re-smoke-tested after hardening:
- Valid current-secret JWT → 200 ✅ (existing users still work)
- Wrong-secret JWT → 401 ✅
- `/healthz` → 200 ✅
- Server boots cleanly with `JWT_SECRET` from env, no fallback path remains.

---

## Estimated effort

- Phase 0: 1 session
- Phase 1: 1 session
- Phase 2: 1–2 sessions
- Phase 3: 2–3 sessions (mobile UX + thorough testing)
- Phase 4: 0.5 session (weeks later)

Total: ~5–7 working sessions before the new build is ready for TestFlight.

---

## What this plan does NOT do

- Does not touch the password upgrade modal we just shipped — it stays live and stops being shown automatically once Clerk takes over (Phase 4 removes it).
- Does not change RevenueCat product IDs, offerings, or entitlements.
- Does not migrate Replit Auth users (we're not on Replit Auth — we're on custom JWT).
- Does not implement organization/team features for "CTL Enterprise" — that's a separate piece of Build 28 that can build on top of this.

---

## Phase 3 — shipped (mobile app cutover to Clerk)

The Expo app (`artifacts/car-logbook`) now authenticates through Clerk while the local numeric `users.id` is preserved as RevenueCat's `appUserID`. All 71 prod entitlements are unaffected.

### What shipped
- `app/_layout.tsx`: wrapped everything in `<ClerkProvider publishableKey={EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY} tokenCache={...}>` (token cache from `@clerk/clerk-expo/token-cache`, backed by SecureStore).
- `hooks/useApi.ts`: `getToken()` now prefers `getClerkInstance().session?.getToken()` and falls back to the legacy SecureStore JWT — Phase-1 dual-auth middleware accepts either.
- `context/AuthContext.tsx`: rewritten to bridge Clerk → local user. On any Clerk session change to "signed in" it POSTs `/auth/clerk/sync-user` once (deduped via `syncedClerkIdRef`), populates context with the local `{id, name, email, isAdmin}`, then flushes the legacy SecureStore keys. Cold-start grace path still honors a legacy JWT if no Clerk session exists. `logout()` calls Clerk `signOut()` AND clears legacy keys (resolves follow-ups #15 / #16).
- `app/(tabs)/index.tsx` (login): `useSignIn` → on `form_identifier_not_found` falls back to `POST /auth/clerk/migrate` and retries Clerk sign-in transparently. Generic "Invalid email or password" everywhere; 429 surfaces "Too many attempts".
- `app/(tabs)/signup.tsx`: `useSignUp` two-step flow — `signUp.create` + `prepareEmailAddressVerification({strategy:"email_code"})` → 6-digit code entry → `attemptEmailAddressVerification` + `setActive`. Apple/Google buttons wired via `useSSO.startSSOFlow` with `Linking.createURL("/(tabs)")` redirect. Local DB row is created automatically by AuthContext's sync-user effect after `setActive`.
- `lib/revenuecat.tsx`: removed `decodeJwtIsAdmin(token)` (Clerk session tokens have a different shape). `isAdmin` now comes from `user.isAdmin` returned by `/auth/clerk/sync-user`. **`Purchases.logIn(String(user.id))` line untouched** — `user.id` is still the local numeric id, NOT the Clerk id. This is the load-bearing line for the 71 prod users' entitlements.
- Added `expo-auth-session` dep (required by `useSSO`).

### Verification done
- `pnpm --filter @workspace/car-logbook exec tsc --noEmit`: only pre-existing baseline errors (15 in maintenance/edit-profile/faults/feedback/forgot-password/fuel/select-picker/DashboardLightIcons/notifications). No new errors from Phase 3 files.
- Web bundle succeeds after adding `expo-auth-session`.
- No prod publish, no EAS build trigger.

### Deferred / follow-ups
- Forgot-password screen still uses the legacy `/auth/forgot-password` endpoint. Server already silently no-ops for migrated users; needs Clerk `signIn.create({strategy:"reset_password_email_code"})` flow in a follow-up.
- Phase 4 (next build): remove the legacy-JWT cold-start branch from `AuthContext`, drop `users.password_hash`, rotate `JWT_SECRET`.

---

## Phase 3.1 — forgot-password Clerk wiring

The forgot-password screen now drives Clerk's `reset_password_email_code` flow with a graceful fallback to the legacy `/auth/forgot-password` endpoint for users who haven't yet been migrated into Clerk.

### Flow
1. **Email step** → `signIn.create({ strategy: "reset_password_email_code", identifier: email })`.
   - On success: transition to the verify step.
   - On `form_identifier_not_found` (legacy user, not yet in Clerk): silently call `POST /auth/forgot-password` and show the generic "check your email for a reset link" success state.
   - On any other failure: generic "Couldn't start password reset right now."
2. **Verify step** → `signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code, password })` then `setActive({ session: createdSessionId })` → `router.replace("/home")`. The user is auto-signed-in with the new password; the AuthContext sync-user effect mirrors them into the local DB on the way through.
3. **Resend code** → re-invokes `signIn.create` with the same identifier.

### Non-enumeration
- Generic error strings throughout. We never reveal whether an account exists in Clerk vs. legacy vs. neither.
- The visible difference between code-entry (Clerk) and link-sent (legacy) is a small enumeration channel during the migration window. It collapses automatically once Phase 4 removes the legacy branch.

### Verification
- `pnpm --filter @workspace/car-logbook exec tsc --noEmit`: only pre-existing baseline errors remain. Zero new errors from the rewritten file.
- Web bundle succeeds.
- No prod publish.

## Phase 3.2 — login OAuth + redirect path fix

Added Clerk-hosted OAuth (Apple + Google) to the login screen, mirroring the buttons that already shipped on the signup screen. Also tightened the SSO `redirectUrl` on both screens.

### Login OAuth
- `useSSO()` hook + `handleOAuth(strategy)` wired in `app/(tabs)/index.tsx`.
- Buttons rendered above the email field inside `formCard`, separated by an `or use email` divider — same visual contract as signup.
- Failures collapse to the existing `GENERIC_ERROR = "Invalid email or password."` (no provider-specific leakage). User cancellation (no `createdSessionId`) is a silent no-op.
- Reuses the screen-wide `loading` state so OAuth and password submission can't fire concurrently.

### Redirect path
- Both login and signup now call `Linking.createURL("/")` instead of `Linking.createURL("/(tabs)")`.
- Route groups in parens are not URL-facing in Expo Router, so `/(tabs)` was a brittle deep-link target across providers. Root path is the actual app entry.

### Verification
- `pnpm --filter @workspace/car-logbook exec tsc --noEmit`: no new errors from the touched files.
- Architect evaluate-task review: pass, no severe findings.
- No prod publish.

## Phase 3.3 — link OAuth in Settings + signup resend cooldown

Two small UX additions — finish the loose ends from the OAuth rollout.

### Settings → "Sign-in methods" card (#3)
- New `ConnectedAccountsCard` in `app/settings.tsx`. Shown only when a Clerk session exists (`useUser()` returns a user) — legacy users see nothing until they migrate.
- Apple and Google rows. Each row's pill says **Connect** or **Connected** (green) and is replaced by a spinner while in flight.
- Connect: `user.createExternalAccount({ strategy, redirectUrl })` → opens `verification.externalVerificationRedirectURL` via `expo-web-browser` `openAuthSessionAsync` → `user.reload()` on success.
- Disconnect: native `Alert.alert` confirmation then `account.destroy()` + `user.reload()`. We rely on Clerk's server-side "must keep at least one sign-in method" guard and surface its rejection in a friendly alert instead of a stack trace.

### Signup → 60s resend cooldown (#4)
- New `resendCooldown` state seeded to 60s on entering the verify step and reset to 60s on every successful resend.
- `useEffect` ticks the counter once per second and clears its interval on unmount / cooldown reaching 0.
- Resend button is disabled while the counter > 0, label flips between `Resend code` and `Resend code in 42s`. Protects Clerk's per-user rate limit and reads as a friendly "give it a moment" instead of a generic error.

### Verification
- `pnpm --filter @workspace/car-logbook exec tsc --noEmit`: only the documented pre-existing baseline error remains. No new errors.
- Architect evaluate-task review: pass on substance; flagged provider-key concern resolved by TypeScript (Clerk's `provider` enum uses bare `"apple"`/`"google"`).
- No prod publish.
