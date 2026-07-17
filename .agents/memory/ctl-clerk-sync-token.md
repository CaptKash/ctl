---
name: CTL Clerk sync token reliability
description: Root-cause and fix for "no name + authentication required" after Clerk OAuth sign-in. Two client-side bugs, one visibility gap.
---

## Bug 1 — early return killed retries

In `AuthContext.tsx` `attemptSync`:

```ts
// BROKEN: return inside try exits before the retry scheduler
if (!sessionToken) return;

// FIXED: throw so catch handles it and retry fires
if (!sessionToken) throw new Error("Clerk token not ready yet");
```

`return` inside a `try` block skips the code that follows the entire `try/catch/finally`, so the exponential-backoff retry was never scheduled when the token wasn't ready immediately after `setActive`. The sync died silently on the first attempt.

**Why:** Clerk's `getToken()` can return `null` for a brief window right after `setActive()` — the session object exists but the token hasn't refreshed yet. The retry loop exists precisely for this, but the early return was bypassing it.

## Bug 2 — no token fallback for API calls after sync

`useApi.ts` used `getClerkInstance().session?.getToken()` as the only Clerk path. After a successful sync, `clearLegacyTokens()` wipes SecureStore. On Expo web (and occasionally native), `getClerkInstance()` may return the global object but `.session?.getToken()` can resolve to `null` — leaving `getToken()` returning `null` → every API call sends no Authorization header → 401.

**Fix:** Export `getClerkTokenForApi()` from `AuthContext.tsx` backed by a module-level ref set from `useAuth().getToken` (hook-based, always in sync with the active session). `useApi.ts` tries this first, then falls back to `getClerkInstance()`, then legacy SecureStore.

**How to apply:** Any non-React context that needs a Clerk token should call `getClerkTokenForApi()` from AuthContext, not `getClerkInstance().session?.getToken()` directly.

## Visibility gap

`syncUserWithServer` and `attemptSync` were swallowing all errors silently. Added `__DEV__` logging (status code + body on failure, attempt number). Server-side `requireClerkSession` and `requireAuth` now log when Clerk userId is null despite a Bearer header being present.
