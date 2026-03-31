# Car Technical Log (CTL) — Project State

## Overview
Aviation-style car logbook mobile app. iOS only (TestFlight). Freemium model:
- Free: up to 2 cars
- CTL Fleet ($2.99/mo, $19.99/yr, $24.99 lifetime): unlimited vehicles + premium tools

## Architecture
- `artifacts/car-logbook` — Expo React Native app (SDK 54)
- `artifacts/api-server` — Express + PostgreSQL backend
- `artifacts/ctl-promo-video` — Promotional video (React + Framer Motion)
- `artifacts/mockup-sandbox` — Component preview server

## Key Identifiers
- Bundle ID: `com.ctl.carlogbook`
- Apple Team: `7TU3WQ845C`
- ASC App ID: `6760766535`
- EAS Project ID: `2984157c-0a32-485b-8b48-1048d72a1520`

## RevenueCat
- iOS production key: `appl_LRjDIRTvidTYYIqipELDpvRAyjX`
- iOS test key: `test_PBSHgnlulFoqCVjXUEsBEzNBWRQ`
- Android key: `goog_FIsrsuflbNEdjOgxcIXJzwwCOtl`
- Entitlement: `fleet`
- Product IDs: `ctl_fleet_monthly`, `ctl_fleet_annual`, `ctl_fleet_lifetime`
- Offering: identifier `default`, display name "CTL Fleet Offering" — all 3 packages configured in dashboard

## Admin
- Admin user: `mkashour.apple@gmail.com` (DB user ID: 11)
- `is_admin = true` set directly in production DB — no build needed
- Admin secret: `ctl-admin-secret-2025`
- Grant endpoint: `POST /api/auth/admin/grant` with `{ email, secret }`

## Build History
- Build 10: MediaLibrary photo save (failed — wrong approach)
- Build 11: Reverted to expo-sharing + modal dismiss pattern
- Build 12: RevenueCat API key simplified, offerings fallback to any offering
- Build 13: RevenueCat `isConfigured` check + self-healing initialization in query
- Build 14 (current in TestFlight): + 200ms delay in onDismiss before shareAsync

## Known Issues (as of end of session 2026-03-31)
1. **Photo save ("Save failed")** — persists through Build 14. The `onDismiss` + `setTimeout(doShare, 200)` approach still fails. Root cause unknown — the catch block swallows the real error. **Next step**: change `catch` to `catch (e: any)` and show `e?.message` in the alert so the real error is visible. Do this BEFORE triggering another build.
2. **RevenueCat "Connecting to App Store"** — `Purchases.configure()` failing silently. Build 13+ has `isConfigured` guard and self-healing query. Not yet confirmed fixed.

## Important Rules
- **DO NOT trigger EAS builds without explicit user permission**
- **DO NOT submit to TestFlight without explicit user permission**
- Always diagnose fully before building — confirm the fix is correct first

## Secrets in Use
- `EXPO_TOKEN` — EAS CLI authentication
- `RESEND_API_KEY` — email (reset password flow)
- `DATABASE_URL` — PostgreSQL production DB

## Next Planned Features
- Arabic (RTL) support
- Google Play (Android on hold — Play Console account being verified)
