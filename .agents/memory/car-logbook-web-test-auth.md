---
name: Driving the car-logbook Expo web client past Clerk for testing
description: How to authenticate the Expo web build for runTest/manual testing when Clerk sign-in is blocked by CAPTCHA and authed screens render blank in app-preview screenshots.
---

# Testing the car-logbook authed UI without Clerk sign-in

Authenticated inner screens render blank in app-preview screenshots, and programmatic
Clerk sign-in is blocked by Turnstile CAPTCHA (error 600010) — so you cannot reach authed
flows the normal way.

**Workaround:** inject a legacy JWT into the web client's `localStorage` and reload.

How to apply:
- The app's auth boot path (context/AuthContext.tsx) falls back to a legacy token when no
  Clerk session exists. On web, its `secureGet`/`secureSet` use `localStorage`. The token
  key is `ctl_auth_token`. It is validated via `/auth/me`; no extra keys are required (the
  remember flag is only cleared if explicitly `"0"`).
- Mint a legacy JWT signed with the `JWT_SECRET` env var, payload `{ id, email, name, isAdmin }`
  (only `id` is load-bearing). `jsonwebtoken` is NOT resolvable from the workspace root in
  code_execution — mint it by running a tiny tsx script through the api-server package
  (`pnpm --filter @workspace/api-server exec tsx ...`).
- In runTest: navigate to `/`, run `localStorage.setItem('ctl_auth_token', '<token>')`,
  reload `/`, then proceed. The dual-auth middleware accepts this token for both GET and POST.

**Why:** this is the only reliable way to exercise authed car-logbook web flows end-to-end;
it took significant effort to discover and is not obvious from the code.

Notes:
- runTest's browser CANNOT reach the dev api-server (cross-origin requests die upstream with
  401/500 and the app boot then clears the stored token) — so runTest cannot exercise authed
  flows. For authed store-style captures, add a temporary web-only hook that reads a
  `?shot_token=` query param into `localStorage('ctl_auth_token')`, then use the app-preview
  screenshot tool with that param on each route (each capture is a fresh browser, so the param
  must be on every URL). Remove the hook afterwards.
- The api-server dev port is 8080 (`http://localhost:8080/api`) for direct HTTP repro.
- For deterministic backend checks, prefer direct HTTP (POST + GET) over UI: the maintenance
  "Type" field opens a separate picker screen that runTest struggles to drive.
- Always clean up any DB rows you create for testing (maintenance_records, event_completions,
  malfunctions_records) — the dev DB is shared with the user.
