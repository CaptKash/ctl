---
name: Clerk SSO stale JWT cleanup
description: Must delete __clerk_client_jwt from SecureStore before signIn.create() for OAuth strategies or the SDK silently bails pre-fetch when a cross-tenant JWT is stored.
---

# Clerk SSO stale JWT cleanup

**Rule:** Always call `await SecureStore.deleteItemAsync("__clerk_client_jwt").catch(() => {})` immediately before `signIn.create({ strategy: "oauth_apple" | "oauth_google", ... })`.

**Why:** The Clerk SDK reads `__clerk_client_jwt` from SecureStore at call time to authenticate the FAPI request. If a JWT from a *different Clerk tenant* is stored (e.g. left over from the Replit-managed tenant after migrating to a self-hosted instance), the SDK silently bails out before making any network call — `signIn.create()` returns `status: null, externalVerificationRedirectURL: null` with no error thrown. Deleting the key forces the SDK to create a fresh unauthenticated client for the OAuth flow.

**How to apply:** Any `handleOAuth` function that calls `signIn.create({ strategy: oauthStrategy })`. Already in place in `app/(tabs)/index.tsx` and `app/(tabs)/signup.tsx`.

**Note:** This is a `.catch(() => {})` no-op if the key doesn't exist — safe to always call.
