---
name: Clerk Expo native SSO redirect
description: How to fix Clerk OAuth failing on native Expo builds when the app's custom scheme is not an allowed redirect origin.
---

# Clerk Expo Native SSO Redirect

## The rule
Replit-managed Clerk does not allow `car-logbook://` (custom scheme) as a redirect origin. On native builds, `startSSOFlow` with no `redirectUrl` fails because Clerk can't redirect back to the app scheme.

**Fix:** Server-side relay — point `redirectUrl` at an HTTPS URL you control, which 302-redirects to the app's deep-link scheme.

## How to apply
- In `handleOAuth` on native (`Platform.OS !== "web"`), pass `redirectUrl: https://<domain>/api/sso-callback` to `startSSOFlow`.
- On the API server, add a public `GET /api/sso-callback` route that reads `req.query` and does `res.redirect("car-logbook://sso-callback?" + params)`.
- Mount that route **before** any router that has a bare `router.use(requireAuth)` (no path prefix), or it will be intercepted and return 401.
- The production domain must be in Clerk's allowed origins (Replit-managed Clerk already allows `ctl-car-technical-log.replit.app`).

**Why:** Clerk validates the `redirectUrl` against its allowed origins. Custom schemes (`car-logbook://`) are not allowed. HTTPS URLs on the Clerk-registered domain are allowed. The server relay bridges the gap.

## Pitfalls
- `useSignInWithApple` / `oauth_token_apple` strategy: incompatible with Replit-managed Clerk (web-only Apple OAuth config). Always use `startSSOFlow({ strategy: "oauth_apple", redirectUrl })` instead.
- `router.use(requireAuth)` with no path prefix inside a child Express router intercepts ALL unmatched requests entering that router — mount public routes first.
- The `dist/` folder is gitignored; production deployment uses the workspace snapshot's dist. Must run `pnpm --filter @workspace/api-server run build` locally before publishing so the new dist is included in the snapshot.
- **eas.json `env` block overrides EAS server-side environment variables.** Replit injects the live Clerk key (`pk_live_...`) into the EAS production environment, but if `eas.json` has `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_...` in the production profile env, that wins — causing all authenticated server calls to return 401 (test JWT rejected by live Clerk). Fix: remove the key from `eas.json` env so EAS falls back to its server-side production value.
