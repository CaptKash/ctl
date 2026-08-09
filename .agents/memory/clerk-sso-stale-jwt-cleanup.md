---
name: Clerk SSO stale JWT cleanup
description: Must delete __clerk_client_jwt from SecureStore before signIn.create() for OAuth strategies or the SDK silently bails pre-fetch when a cross-tenant JWT is stored.
---

# Clerk SSO stale JWT cleanup

**Rule:** Always call `await SecureStore.deleteItemAsync("__clerk_client_jwt").catch(() => {})` immediately before ANY `signIn.create()` call — both OAuth strategies and email/password.

**Why:** The Clerk SDK reads `__clerk_client_jwt` from SecureStore at call time. A stale JWT from a previous session (OAuth or otherwise) causes two distinct failure modes:
- For OAuth: SDK silently bails pre-fetch — `signIn.create()` returns `status: null` with no error thrown.
- For email/password: SDK treats it as a cross-tenant conflict and returns an auth failure even when credentials are correct. This surfaces as "invalid username or password" to the user.

**How to apply:** Before every `signIn.create()` call regardless of strategy. Already in place in `app/(tabs)/index.tsx` (`handleOAuth` and `tryClerkSignIn`) and `app/(tabs)/signup.tsx`.

**Note:** This is a `.catch(() => {})` no-op if the key doesn't exist — safe to always call.
