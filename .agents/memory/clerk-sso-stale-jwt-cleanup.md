---
name: Clerk SSO stale JWT cleanup
description: Must delete __clerk_client_jwt from SecureStore before signIn.create() for OAuth strategies or the SDK silently bails pre-fetch when a cross-tenant JWT is stored.
---

# Clerk SSO stale JWT cleanup

**Rule:** Always call `await SecureStore.deleteItemAsync("__clerk_client_jwt").catch(() => {})` immediately before ANY `signIn.create()` call — both OAuth strategies and email/password.

**Why:** The Clerk SDK reads `__clerk_client_jwt` from SecureStore at call time. A stale JWT from a previous session (OAuth or otherwise) causes two distinct failure modes:
- For OAuth: SDK silently bails pre-fetch — `signIn.create()` returns `status: null` with no error thrown.
- For email/password: SDK treats it as a cross-tenant conflict and returns an auth failure even when credentials are correct. This surfaces as "invalid username or password" to the user.

**How to apply:** Before every `signIn.create()` call regardless of strategy. Use the `clearClerkCache()` helper in `app/(tabs)/index.tsx` — it wipes all three keys. Deleting only `__clerk_client_jwt` is NOT enough; the client resource cache must also be cleared.

**Do NOT call `clerk.signOut()` inside `handleLogin`.** It mutates Clerk's state mid-flight while `signIn` is already captured in the closure (stale reference risk), and is redundant since `logout()` already calls it. The cache-clearing approach is the correct fix.

**Note:** Keys are safe to delete even when absent — `deleteItemAsync` is a no-op on missing keys.
