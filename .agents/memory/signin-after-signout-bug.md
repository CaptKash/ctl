---
name: Sign-in-after-sign-out bug root cause
description: Why email sign-in fails with "Invalid email or password" after signing out, and the two-part fix.
---

## The bug

Email sign-in → sign out → sign in again with the same credentials → "Invalid email or password".

## Root causes

Two compounding bugs:

### Bug 1 — stale session JWT in SecureStore

After `clerk.signOut()`, the revoked session JWT remains in `__clerk_cache_session_jwt_{suffix}` in SecureStore (Clerk does not always purge it). When `tryClerkSignIn` calls `signIn.create({ identifier, password })`, the Clerk SDK sends this stale/revoked JWT to FAPI. FAPI responds with a non-"complete" status (e.g. "needs_first_factor") rather than "complete". `tryClerkSignIn` logs the non-complete status and **returns false** — it does not throw — so the outer catch in `handleLogin` never fires.

**Why:**
- Confirmed by production logs: `POST /api/auth/clerk/migrate` was called (proving `tryClerkSignIn` returned false, not threw), followed by no `sync-user` (proving sign-in ultimately failed).
- We deliberately do NOT delete `__clerk_cache_client_{suffix}` because that causes a full re-init race against `signIn.create()` (the Build 110 regression). Only the session JWT needs clearing on the email path.

**Fix:** In `tryClerkSignIn`, delete `__clerk_cache_session_jwt_{suffix}` alongside `__clerk_client_jwt` before calling `signIn.create()`.

### Bug 2 — tryMigrate bails on 409 before reading the body

The migrate endpoint (`POST /auth/clerk/migrate`) returns **409 + `{ alreadyMigrated: true }`** when the user is already in Clerk and their password bcrypt-matches. This is a "success" signal — the password IS correct.

The original `tryMigrate` had:
```ts
if (!res.ok) return false;  // ← executed for 409, discards body
```

Returning false means `handleLogin`'s step-3 retry of `tryClerkSignIn` never runs, and "Invalid email or password" is shown even though the credentials are valid.

**Fix:** Read the body before checking `res.ok`. Return `true` when `data.alreadyMigrated === true`, regardless of status code. 401 (genuine bad credentials) still returns false.

## How to apply

In `artifacts/car-logbook/app/(tabs)/index.tsx`:

- `tryClerkSignIn`: clear both `__clerk_client_jwt` AND `__clerk_cache_session_jwt_{suffix}` before `signIn.create()`.
- `tryMigrate`: read body unconditionally; return `true` for `data.alreadyMigrated === true` even when `!res.ok`.

The session JWT suffix is the last 5 characters of `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## What NOT to clear

Do **not** clear `__clerk_cache_client_{suffix}` in the email path. That key holds Clerk's client state object; deleting it while the SDK is running triggers a full re-initialisation that races with `signIn.create()` and causes sign-in to fail silently (the Build 110 regression, since fixed). It IS cleared in `clearOAuthCache()` because OAuth uses a redirect flow where the re-init has time to complete before `signIn.create()` is called.
