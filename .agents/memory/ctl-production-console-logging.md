---
name: CTL production console logging
description: console.warn is silenced in production React Native/Hermes builds; use console.error for any diagnostics that need to appear in device Console.app
---

# Production Console Logging in React Native / Hermes

## Rule
Always use `console.error` (never `console.warn` or `console.log`) for any diagnostic output intended to be visible in device Console.app from a TestFlight/production build.

**Why:** In production React Native builds (`__DEV__ === false`), `console.warn` and `console.log` are replaced with no-ops. `console.error` is the only level that still forwards to the native iOS system logger and appears in Console.app.

**How to apply:** Any time you add SSO diagnostics, auth debugging, or other production-facing log statements, use `console.error("[TAG]", ...)`.

---

# Clerk v2 startSSOFlow Internals

## Rule
Do not re-implement the OAuth transfer flow in app code — Clerk v2's `startSSOFlow` handles it internally.

**Why:** In `@clerk/clerk-expo` v2.x, `startSSOFlow` already:
1. Calls `signIn.create({ strategy, redirectUrl })`
2. Opens `WebBrowser.openAuthSessionAsync`
3. On success, checks `signIn.firstFactorVerification.status === "transferable"` and automatically calls `signUp.create({ transfer: true })`
4. Returns `{ createdSessionId: signUp.createdSessionId ?? signIn.createdSessionId, authSessionResult, signIn, signUp, setActive }`

**How to apply:** After `startSSOFlow`, only check `createdSessionId` and `authSessionResult.type`. Never add a custom transfer flow in the `else` branch — it is dead code.

## authSessionResult.type values
- `null` → Clerk wasn't loaded when called (early return)
- `"cancel"` / `"dismiss"` → user cancelled the OAuth sheet — show no error
- `"success"` → OAuth completed but no session created (log and show error)
- anything else → unexpected — log and show generic error
