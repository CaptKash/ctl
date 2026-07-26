---
name: iOS SSO HTTPS scheme bug
description: Why using an HTTPS redirectUrl with startSSOFlow breaks ASWebAuthenticationSession on iOS — and the fix.
---

# iOS SSO — HTTPS redirectUrl breaks ASWebAuthenticationSession

## The Rule
Never pass an `https://` URL as `redirectUrl` to `startSSOFlow` / `openAuthSessionAsync` on iOS. Always use the app's custom scheme (`car-logbook://sso-callback`).

**Why:** `expo-web-browser` extracts the URL scheme from `redirectUrl` and passes it to iOS as `callbackURLScheme` for `ASWebAuthenticationSession`. iOS rejects `"https"` as a callback scheme (not a custom/unique scheme), causing `openAuthSessionAsync` to throw immediately — the browser never opens, and the catch block shows "Sign in failed."

**How to apply:** In `app/(tabs)/index.tsx` and `app/(tabs)/signup.tsx`, `startSSOFlow` must always receive `redirectUrl: "car-logbook://sso-callback"`. Do NOT use `EXPO_PUBLIC_DOMAIN` to construct an HTTPS relay URL for this parameter.

## Root cause timeline
- Build 79 (pk_test, no `EXPO_PUBLIC_DOMAIN`): `redirectUrl` was `undefined` → Clerk SDK fell back to `AuthSession.makeRedirectUri()` = `car-logbook://sso-callback` → worked.
- Build 82–83 (pk_live, `EXPO_PUBLIC_DOMAIN` set): `redirectUrl` = `https://ctl-car-technical-log.replit.app/api/sso-callback` → `callbackURLScheme: "https"` → iOS throws immediately → no browser sheet ever appears.

## Layer 1 fix (also required)
Production Clerk's redirect URL allowlist must contain `car-logbook://sso-callback`. Registered via `registerClerkRedirectUrls()` in `artifacts/api-server/src/index.ts` — runs on every server startup, idempotent.

## Fixed in build 84
- `redirectUrl: "car-logbook://sso-callback"` hardcoded in both sign-in and sign-up screens.
- `EXPO_PUBLIC_DOMAIN` still used for API base URL — that's fine, only the SSO redirect was the problem.
