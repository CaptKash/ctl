---
name: Clerk production redirect URL configuration
description: Production Clerk allowlist is strict — all redirect URLs used in startSSOFlow must be explicitly registered using sk_live key.
---

# Clerk Production Redirect URL Configuration

## The Rule
Every URL passed as `redirectUrl` to `startSSOFlow` (or `signIn.create`) must be explicitly added to the production Clerk instance's allowed redirect URLs. The production Clerk allowlist starts empty.

**Why:** Production Clerk (sk_live) is strict. Dev Clerk (sk_test) is permissive. A URL that works in development will fail in production with `resource_missmatch` / "Redirect url mismatch" — Clerk rejects the `signIn.create()` call before the browser ever opens.

## Currently Registered (production Clerk, as of 2026-07-26)
- `https://ctl-car-technical-log.replit.app/api/sso-callback` ← relay URL used by mobile app SSO

## How to Add URLs to Production Clerk
The `sk_live_...` key is only available in the deployed API server's `process.env.CLERK_SECRET_KEY`. Dev environment has `sk_test_...`.

**Method used:** Added a one-time protected admin endpoint to the API server, deployed it, called it, then removed it. The endpoint called `POST https://api.clerk.com/v1/redirect_urls` with the sk_live key.

**Alternative:** List existing URLs with `GET https://api.clerk.com/v1/redirect_urls` using sk_live.

## Diagnostic Command
```bash
# Proves redirect URL is accepted (no resource_missmatch):
curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "strategy=oauth_apple" \
  --data-urlencode "redirect_url=https://ctl-car-technical-log.replit.app/api/sso-callback" \
  "https://ctl-car-technical-log.replit.app/api/__clerk/v1/client/sign_ins"
```

## Root Cause of Build 83 Sign-in Failure
- Symptom: "Sign in failed. Please try again." immediately on tap, browser never opens
- Build 79 (pk_test/dev Clerk) worked because dev Clerk allowlist is permissive
- Build 83 (pk_live/prod Clerk) failed because prod Clerk allowlist was empty
- The proxy was working correctly (HTTP 200 confirmed), OAuth providers were enabled — the ONLY issue was the missing redirect URL registration
