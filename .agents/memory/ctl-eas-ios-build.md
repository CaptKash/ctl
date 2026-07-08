---
name: Running EAS iOS builds for car-logbook from the main agent
description: How to kick off a native EAS iOS build (needed for on-device RevenueCat purchase testing) from the Replit main-agent sandbox, and the two gotchas that make it look like it failed.
---

# Native EAS iOS build for CTL / car-logbook

On-device purchase testing (RevenueCat) and multi-device sync QA require a **native EAS build → TestFlight**, NOT the `pnpm --filter @workspace/car-logbook run build` script. That `scripts/build.js` only produces the static Expo Go OTA JS bundle (Metro bundle + manifest) for the Replit-hosted deployment; in-app purchases do not run there.

Native build command (auth uses the `EXPO_TOKEN` secret for the project's configured Expo account):
`EAS_NO_VCS=1 EXPO_TOKEN="$EXPO_TOKEN" npx --no-install eas build --platform ios --profile production --non-interactive --no-wait`
(eas-cli is available via npx; `production` profile = store distribution → TestFlight, `ascAppId 6760766535`.)

## Gotcha 1 — git index.lock
Default `eas build` uses git to archive the project and writes `.git/index.lock`. The main-agent sandbox blocks git writes ("Destructive git operations are not allowed"), so the build aborts.
**Fix:** set `EAS_NO_VCS=1` so EAS tars the working directory directly instead of via git.

## Gotcha 2 — local CLI times out but the build still queues
Even with `--no-wait`, the local CLI can exceed the bash tool timeout while uploading the project archive and return exit -1 with truncated output. **Do NOT blindly retry** — the build is usually already submitted.
**Verify instead:** `EXPO_TOKEN="$EXPO_TOKEN" npx --no-install eas build:list --platform ios --limit 1 --non-interactive` and confirm a build with the expected Version/Build number is "in queue"/"in progress".

**Why:** both failures look fatal but aren't; retrying risks queuing duplicate builds and burning EAS build minutes.

## Gotcha 3 — TestFlight submit fails instantly with no EAS error message
`eas submit --platform ios` can fail immediately ("✖ Something went wrong when submitting your app to Apple App Store Connect") while the EAS API records `status: ERRORED`, `error: null`, `canRetry: false`, `appStoreConnectBuildUpload: null` (binary never reached Apple). EAS does NOT surface Apple's real error.
**Root cause seen:** Apple returns `403 FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED` (link → /business). For CTL this is the **Paid Applications Agreement** (required because the app has in-app purchases / paid Enterprise tiers) — separate from the general Developer Program License / Free Apps agreement. Only the **Account Holder** can sign it, and it needs tax + banking completed before it flips to **Active**.
**How to confirm the real error:** the Apple 403 shows in the interactive `eas submit` foreground output / dashboard, not the EAS GraphQL `error` field. After the agreement is Active (allow a few min to propagate), re-run submit — a healthy run goes `IN_PROGRESS` (uploads for 5–15 min) instead of instant ✖.
**Note:** the same Paid Apps agreement is also required for RevenueCat/StoreKit purchases to function at all.

## Gotcha 4 — EAS builds do NOT see Replit secrets → release-only crash on launch
`EXPO_PUBLIC_*` vars are inlined at bundle time from the EAS build server's env, which is ONLY `eas.json` `build.<profile>.env` plus EAS-hosted env vars (`eas env:list --environment production`). Replit secrets never transfer. The Clerk publishable key lived only in Replit secrets → TestFlight builds shipped with an empty key → `ClerkProvider` (outermost, above ErrorBoundary) threw on mount → instant crash on launch, while dev worked fine.
**Fix pattern:** `eas env:create --environment production --name <VAR> --value "$VAR" --visibility plaintext --scope project --type string --non-interactive` (shell substitution, value never printed) + set `"environment": "production"` on the build profile in eas.json so hosted vars are pulled in.
**How to verify a suspected missing var without a device:** download the build IPA, unzip, `strings Payload/*.app/main.jsbundle | grep <key-prefix>` — beware coincidental substring matches (Clerk SDK contains literal `pk_live`/`pk_test` text); anchor the grep to the full key shape.

## Version bumps before a build
Bump in `app.json` before building: `expo.version` (marketing), `expo.ios.buildNumber` (must be unique per iOS submission), `expo.android.versionCode`. Enterprise release was cut as **2.0.0** (major, not 1.1) due to the category shift to multi-user orgs.

## Gotcha 5 — Replit-managed Clerk: mobile builds need pk_live, but only the deployment has it
Replit-managed Clerk auto-swaps `pk_test`/`sk_test` → live keys ONLY inside Replit deployments. EAS mobile builds bake in whatever `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` value you give them — using the Replit-secret value ships a `pk_test` (dev-tenant) key, so store builds create sessions on the DEV Clerk tenant while the prod api-server verifies with `sk_live` → every sign-in 401s at `/auth/clerk/sync-user`. Dev and prod Clerk user stores are fully separate.
**Fix pattern:** api-server exposes public `GET /api/auth/clerk/config` returning its `CLERK_PUBLISHABLE_KEY`; after a production republish, curl it to read the `pk_live` key, then set that as the EAS-hosted `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for the production environment and rebuild. Keep the pk_test value for dev/Expo Go.
**Why:** publishable keys are public by design, so the endpoint is safe; there is no other way to read the deployment-injected live key from the workspace.

## Store-review demo account
Dedicated reviewer login exists in PROD as a legacy user (email `reviewer@ctl-car-technical-log.replit.app`, local users row, bcrypt password — credentials stored in Play Console/ASC review fields, not here) with a seeded demo car + maintenance records. First app sign-in migrates it to a live-tenant Clerk user via `/auth/clerk/migrate` — requires the pk_live fix above to work.
