---
name: Running EAS iOS builds for car-logbook from the main agent
description: How to kick off a native EAS iOS build (needed for on-device RevenueCat purchase testing) from the Replit main-agent sandbox, and the two gotchas that make it look like it failed.
---

# Native EAS iOS build for CTL / car-logbook

On-device purchase testing (RevenueCat) and multi-device sync QA require a **native EAS build → TestFlight**, NOT the `pnpm --filter @workspace/car-logbook run build` script. That `scripts/build.js` only produces the static Expo Go OTA JS bundle (Metro bundle + manifest) for the Replit-hosted deployment; in-app purchases do not run there.

Native build command (auth uses the `EXPO_TOKEN` secret; account is `mkashour`):
`EAS_NO_VCS=1 EXPO_TOKEN="$EXPO_TOKEN" npx --no-install eas build --platform ios --profile production --non-interactive --no-wait`
(eas-cli is available via npx; `production` profile = store distribution → TestFlight, `ascAppId 6760766535`.)

## Gotcha 1 — git index.lock
Default `eas build` uses git to archive the project and writes `.git/index.lock`. The main-agent sandbox blocks git writes ("Destructive git operations are not allowed"), so the build aborts.
**Fix:** set `EAS_NO_VCS=1` so EAS tars the working directory directly instead of via git.

## Gotcha 2 — local CLI times out but the build still queues
Even with `--no-wait`, the local CLI can exceed the bash tool timeout while uploading the project archive and return exit -1 with truncated output. **Do NOT blindly retry** — the build is usually already submitted.
**Verify instead:** `EXPO_TOKEN="$EXPO_TOKEN" npx --no-install eas build:list --platform ios --limit 1 --non-interactive` and confirm a build with the expected Version/Build number is "in queue"/"in progress".

**Why:** both failures look fatal but aren't; retrying risks queuing duplicate builds and burning EAS build minutes.

## Version bumps before a build
Bump in `app.json` before building: `expo.version` (marketing), `expo.ios.buildNumber` (must be unique per iOS submission), `expo.android.versionCode`. Enterprise release was cut as **2.0.0** (major, not 1.1) due to the category shift to multi-user orgs.
