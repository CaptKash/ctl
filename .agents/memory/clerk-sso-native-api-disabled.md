---
name: Clerk SSO native_api_disabled — proxy fix
description: Root cause and fix for Clerk SDK returning blank SignIn objects on production iOS builds. Fix is in clerkProxyMiddleware.ts.
---

## Root cause
`@clerk/clerk-expo` appends `_is_native=1` to every FAPI request via its `onBeforeRequest` hook. When `_is_native=1` is present, Clerk routes the call through its "Native API" path, which requires **Native Applications** to be enabled in the Clerk dashboard. When it is not enabled, Clerk returns `errors[0].code = "native_api_disabled"`. The SDK's `onAfterResponse` handler sees this error, logs it via `console.error` (a no-op in production Hermes/RN), and silently leaves the SignIn resource in its default blank state (all fields null, no errors surfaced to the caller).

**Confirmed by:** raw `fetch()` to the same endpoint *without* `_is_native=1` returned a fully valid response including `external_verification_redirect_url`.

## Fix
`clerkProxyMiddleware.ts` → `proxyReq` handler: strip `_is_native` from the URL query string before forwarding to Clerk FAPI:

```typescript
if (proxyReq.path.includes("_is_native")) {
  const [pathname, search] = proxyReq.path.split("?");
  const params = new URLSearchParams(search ?? "");
  params.delete("_is_native");
  const newSearch = params.toString();
  proxyReq.path = newSearch ? `${pathname}?${newSearch}` : pathname;
}
```

This causes Clerk to treat all SDK calls as web-path requests. The OAuth redirect URL, session data, client JWT chain, and `client.sessions` population all work identically — Clerk's web path is fully compatible with the Expo OAuth flow.

**Why:** The proxy is the single chokepoint for all Clerk FAPI calls. Stripping here preserves the entire SDK flow: `onAfterResponse` still fires, client JWT is still saved to SecureStore, `client.sessions` is still populated, and `setActive` can find the session.

## Why raw-fetch bypass is wrong
If you bypass `signIn.create()` with raw fetch, the SDK's `onAfterResponse` never fires for those calls → client JWT (stored under `__clerk_client_jwt` in SecureStore) is never updated → subsequent SDK calls send stale/empty JWT → `clerk.client.sessions` is never populated → `setActive({ session: id })` does `sessions.find(...)` which returns null → sign-in fails silently.

## Keys
- Replit workspace has `sk_test_*` dev keys only. Production `pk_live_*` / `sk_live_*` live in EAS environment variables. Cannot call Clerk Backend API for production instance from this workspace.
- The production Clerk instance does NOT have Native Applications enabled (as of the fix date).
- Stripping `_is_native=1` at the proxy is the permanent fix — no Clerk dashboard change needed.
