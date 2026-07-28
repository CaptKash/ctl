---
name: Clerk SSO stale-closure fix
description: signIn.create() return value must be captured and used directly — do not read from the signIn closure reference or clerk.client.signIn after the call.
---

## Rule
Always capture the return value of `signIn.create()` and read ALL fields from it directly. Do not read from the closed-over `signIn` hook reference, and do not try `clerk.client?.signIn` — both are stale or null by the time the async handler continues.

**Why:** Confirmed via raw `fetch()` diagnostic (build 93): the proxy correctly returns HTTP 200 with `external_verification_redirect_url`. The Clerk SDK receives the correct response. The bug was simply that builds 91–94 discarded the return value of `signIn.create()` with a bare `await` and then tried to read from the stale closure reference. `clerk.client?.signIn` is also null immediately after `create()` in an async handler. The return value of `signIn.create()` is the populated SignIn resource.

**How to apply:**
```typescript
// ✅ CORRECT — capture and use the return value directly
const result = await signIn.create({ strategy, redirectUrl });
const externalUrl = result?.firstFactorVerification?.externalVerificationRedirectURL;
await result.reload({ rotatingTokenNonce });
if (result.firstFactorVerification.status === "transferable") { ... }
if (result.createdSessionId) { await setActive({ session: result.createdSessionId }); }

// ❌ WRONG — discards the return value, reads stale closure
await signIn.create({ strategy, redirectUrl });
const externalUrl = signIn.firstFactorVerification?.externalVerificationRedirectURL; // null

// ❌ WRONG — clerk.client?.signIn is null in an async handler
await signIn.create({ strategy, redirectUrl });
const freshSignIn = clerk.client?.signIn; // null
```

`useSSO` / `startSSOFlow` also has this bug (discards return value, reads stale `signIn`), so DO NOT use `useSSO` for OAuth flows.

## Proxy is healthy
The Clerk proxy at `https://ctl-car-technical-log.replit.app/api/__clerk` works correctly — confirmed HTTP 200 with full response including `external_verification_redirect_url`. Middleware order (proxy before `express.json()`) in `app.ts` is correct.

## Clerk production instance state (confirmed)
- `oauth_apple` and `oauth_google`: both `enabled=True, authenticatable=True` on production instance
- `car-logbook://sso-callback` registered on both dev and prod Clerk instances
- Production publishable key: `pk_live_*` loaded from EAS "production" environment (not hardcoded in eas.json)
- eas.json production profile does NOT hardcode `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — it comes from EAS dashboard
