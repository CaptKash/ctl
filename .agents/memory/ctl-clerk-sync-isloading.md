---
name: CTL Clerk sync isLoading stuck
description: Why the app gets stuck on the loading spinner even with a per-attempt token timeout, and the correct fix.
---

## Rule
Never include the full `syncing` flag in `isLoading`. Only block on the **first** sync attempt.

## Why
`syncing` was true for the entire retry loop (5 attempts × 8s token timeout + 1+2+4+8+16s delays = up to 71s). Adding a per-attempt 8s timeout helped per-attempt but not the total — the app was still stuck for the whole retry sequence.

## How to apply
Use `initialSyncPending` (a separate state set to `true` before attemptSync(0) and cleared in the `finally` of attempt 0) instead of `syncing` in the `isLoading` formula:

```typescript
const isLoading = !clerkLoaded || !bootDone || initialSyncPending;
```

Background retries (attempts 1–4) continue silently. If one succeeds, `user` is set and the login screen's `useEffect` routes to `/home` automatically.
