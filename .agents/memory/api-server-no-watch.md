---
name: api-server has no hot-reload
description: Editing api-server source does NOT take effect until you restart its workflow.
---

# api-server requires a workflow restart after edits

The `artifacts/api-server: API Server` workflow runs `tsx ./src/index.ts` (NOT `tsx watch`), so it does **not** auto-reload on file changes. Any edit to `artifacts/api-server/src/**` only goes live after restarting that workflow.

**Why:** Cost a confusing debugging loop — a fix looked broken because curl kept hitting the old code (stale error strings, old behavior) until the workflow was restarted.

**How to apply:** After editing api-server code, restart `artifacts/api-server: API Server` before testing via curl / the app. (The Expo/Vite artifacts DO hot-reload; only api-server is the gotcha.)
