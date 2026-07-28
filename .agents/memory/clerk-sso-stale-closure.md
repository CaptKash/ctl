---
name: Clerk SSO stale-closure fix
description: useSSO's startSSOFlow has a React stale-closure bug in Expo; fix is to call signIn.create() directly and use its return value.
---

## Rule
Never use `useSSO` / `startSSOFlow` from `@clerk/clerk-expo` in production Expo builds. Call `signIn.create()` directly and read `externalVerificationRedirectURL` from its **return value**, not from the closed-over `signIn` reference.

**Why:** After `signIn.create()` resolves, Clerk replaces the SignIn resource in its internal state (new object). The `signIn` variable captured in the closure at render-time still points to the pre-create object, which has `externalVerificationRedirectURL: null`. Reading the return value of `signIn.create()` bypasses this entirely.

Symptom: `"@clerk/clerk-expo: Missing external verification redirect URL for SSO flow"` even though the Clerk backend IS returning the URL (confirmed via direct API call to `/v1/client/sign_ins`).

**How to apply:**
```typescript
// WRONG — stale closure
await startSSOFlow({ strategy, redirectUrl });
const { externalVerificationRedirectURL } = signIn.firstFactorVerification; // null!

// CORRECT — use return value
const createdSignIn = await signIn.create({ strategy, redirectUrl });
const externalUrl = createdSignIn.firstFactorVerification?.externalVerificationRedirectURL; // ✅
await WebBrowser.openAuthSessionAsync(externalUrl.toString(), redirectUrl);
```

After browser returns:
1. `await createdSignIn.reload({ rotatingTokenNonce })` using nonce from callback URL
2. If `createdSignIn.firstFactorVerification.status === "transferable"` → `signUp.create({ transfer: true })`
3. Otherwise use `createdSignIn.createdSessionId` with `setActive`

## Clerk production instance state (confirmed)
- `oauth_apple` and `oauth_google`: both `enabled=True, authenticatable=True` on production instance
- `car-logbook://sso-callback` registered on both dev and prod Clerk instances
- Production publishable key: `pk_live_*` (loaded from EAS production env, not workspace secret)
- Workspace `CLERK_SECRET_KEY` is always `sk_test_*` (dev); prod key injected by Replit at deploy time
