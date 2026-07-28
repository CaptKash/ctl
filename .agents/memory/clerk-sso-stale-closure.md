---
name: Clerk SSO stale-closure fix
description: useSSO and direct signIn.create() both suffer a React stale-closure bug; fix is to read clerk.client.signIn after create(), not the captured closure reference.
---

## Rule
Never read `signIn.firstFactorVerification` (or any field) from the `signIn` reference captured by the React hook closure after calling `signIn.create()`. Clerk replaces `clerk.client.signIn` with a **new object** when the API response arrives — the closure reference stays pointing at the old empty resource.

**Why:** Confirmed via raw `fetch()` diagnostic in build 93: the proxy correctly returns HTTP 200 with `external_verification_redirect_url`. The Clerk SDK receives the correct response but creates a new SignIn instance from it (`clerk.client.signIn = new SignIn(responseData)`). The old `signIn` closure reference remains empty. `JSON.stringify(signIn)` shows `_status: null`, all fields null — this is the tell.

**How to apply:**
```typescript
import { useClerk, useSignIn, useSignUp } from "@clerk/clerk-expo";

// In the component:
const clerk = useClerk();
const { signIn } = useSignIn();

// In handleOAuth:
await signIn.create({ strategy, redirectUrl });
// ✅ Read from the live Clerk client — always current
const freshSignIn = clerk.client?.signIn;
const externalUrl = freshSignIn?.firstFactorVerification?.externalVerificationRedirectURL;

// Then use freshSignIn for reload(), createdSessionId, etc.
await freshSignIn.reload({ rotatingTokenNonce });
```

`useSSO` / `startSSOFlow` also has this bug (reads stale `signIn.firstFactorVerification` after `await signIn.create()`), so DO NOT use `useSSO` for OAuth flows.

## Proxy is healthy
The Clerk proxy at `https://ctl-car-technical-log.replit.app/api/__clerk` works correctly — it returns the full Clerk response including `external_verification_redirect_url`. The middleware order (proxy before `express.json()`) in `app.ts` is correct. The 1375 vs 2349 byte discrepancy noted in earlier investigation was a red herring.

## Clerk production instance state (confirmed)
- `oauth_apple` and `oauth_google`: both `enabled=True, authenticatable=True` on production instance
- `car-logbook://sso-callback` registered on both dev and prod Clerk instances
- Production publishable key: `pk_live_*` loaded from EAS "production" environment (not eas.json)
- eas.json production profile does NOT hardcode `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — it comes from EAS dashboard
- `useClerk` is exported from `@clerk/clerk-expo` (via re-export from `@clerk/clerk-react`)
