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

## Root cause — confirmed (build 103)

`signIn.create({ strategy, redirectUrl })` called without `actionCompleteRedirectUrl`.

Inside clerk-js v5 headless `sso()` method (called for all OAuth strategies):
```javascript
let { strategy, redirectUrl: i, redirectCallbackUrl: n } = e;
// public redirectUrl     → n (redirectCallbackUrl) → buildUrlWithAuth(n)
// public actionCompleteRedirectUrl → i (redirectUrl) → try { new URL(i) } catch { window.location.origin + i }
let e = i;  // i = undefined when actionCompleteRedirectUrl not passed
try { new URL(i) }      // new URL(undefined) throws
catch { e = window.location.origin + i }  // window.location is null on RN → TypeError in catch
```

The TypeError inside the catch block propagates to the `ny()` wrapper which swallows all exceptions silently → SignIn resource stays blank → `status: null`, `externalVerificationRedirectURL: null`, **no fetch call ever made**.

**Fix (build 103):** Pass `actionCompleteRedirectUrl: redirectUrl` (same native scheme URL). This lets `new URL(redirectUrl)` succeed in the try block, skipping the `window.location` reference entirely.

```typescript
await signIn.create({
  strategy,
  redirectUrl,
  actionCompleteRedirectUrl: redirectUrl,  // ← prevents window.location crash on RN
});
```

`redirectCallbackUrl` is NOT a public API parameter (TypeScript error if you try to pass it).
The public API params for OAuth signIn.create() are: `strategy`, `redirectUrl`, `actionCompleteRedirectUrl`, `identifier`, `oidcPrompt`, `oidcLoginHint`.

## _is_native=1 stripping
Still in place in `clerkProxyMiddleware.ts`. Harmless. The original "native_api_disabled" root cause was incorrect — no such gate exists on this instance.

## Why raw-fetch bypass is wrong
If you bypass `signIn.create()` with raw fetch, the SDK's `onAfterResponse` never fires → `__clerk_client_jwt` in SecureStore is never updated → subsequent SDK calls send stale JWT → `clerk.client.sessions` is never populated → `setActive` returns null → sign-in fails silently.
