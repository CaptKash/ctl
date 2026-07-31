---
name: Clerk SSO production instance — confirmed configuration
description: Production FAPI /v1/environment findings and current state of the SSO investigation. The native_api_disabled hypothesis was incorrect.
---

## Production Clerk instance — confirmed facts (from /v1/environment)

**Instance:** ins_3DZXnlXiRxxclmNzWH1UimHKqtt  
**FAPI domain:** clerk.ctl-car-technical-log.replit.app  
**Workspace key:** `sk_test_*` only — production `sk_live_*` is EAS-only, not accessible from workspace.

### OAuth providers
Both are fully enabled and not blocked:
```
oauth_apple:  enabled=true, authenticatable=true, not_selectable=false, deprecated=false
oauth_google: enabled=true, authenticatable=true, not_selectable=false, deprecated=false
```
Both appear in `first_factors` and `identification_strategies`.

### "Native Applications" / native_app_support
**This field does not exist** in the production /v1/environment response. "native_app_support: not found" in startup logs = SDK looked for an undefined key. There is no Native Applications toggle on this Clerk plan. `PATCH /v1/instance` with `{"native_app_support": true}` silently ignores the field.

### fraud_settings.native
```json
{ "device_attestation_mode": "disabled" }
```
This is fraud/attestation — entirely separate from OAuth. Irrelevant to sign-in.

### clerk_js_version
`display_config.clerk_js_version = "6"` — dashboard expects v6, but `@clerk/clerk-js` in the lock file is `5.125.10`. Mismatch exists; for native builds the bundled version wins.

## SDK version history
`@clerk/clerk-expo`, `@clerk/clerk-js`, and `@clerk/shared` (mobile tier) have been **identical across all of git history**:
- `@clerk/clerk-expo`: always `2.19.31`
- `@clerk/clerk-js`: always `5.125.10`
- `@clerk/shared` (mobile): always `3.47.5`

The "dependency cleanup" audit bumped server-side packages only (`@clerk/backend`, `@clerk/express`, `@clerk/shared@4.x`). No mobile SDK regression to pin back to.

## Current hypothesis (as of build 102)
Proxy logs show **zero** `POST /v1/client/sign_ins` hits from any device build (builds 91–102). The SDK is either:
(a) not calling fetch at all before returning null/null — suggests internal bail-out before the network call (captcha, SDK state machine, or internal config check)
(b) calling a URL that doesn't go through the proxy

Build 102 has a global fetch interceptor in `_layout.tsx` (globalThis.fetch override) that alerts the URL for any call containing `sign_in`, `__clerk`, `clerk.dev`, or `frontend-api`. If it doesn't fire, the SDK bails before fetch.

## _is_native=1 stripping
Still in place in `clerkProxyMiddleware.ts`. Harmless. The original "native_api_disabled" root cause was incorrect — no such gate exists on this instance.

## Why raw-fetch bypass is wrong
If you bypass `signIn.create()` with raw fetch, the SDK's `onAfterResponse` never fires → `__clerk_client_jwt` in SecureStore is never updated → subsequent SDK calls send stale JWT → `clerk.client.sessions` is never populated → `setActive` returns null → sign-in fails silently.
