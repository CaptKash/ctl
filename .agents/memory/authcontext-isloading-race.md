---
name: AuthContext isLoading race on OAuth sign-in
description: One-render-cycle gap after setActive() where isLoading=false before initialSyncPending is set, causing home screen to redirect to login.
---

# AuthContext isLoading race on OAuth sign-in

**Rule:** `isLoading` in `AuthContext` must include `(isSignedIn && !user)` to prevent a home-screen redirect during the gap between Clerk session activation and sync effect startup.

**Why:** When OAuth completes and `setActive()` is called, `isSignedIn` flips to `true` and triggers a re-render. The Clerk-driven sync effect (which sets `initialSyncPending = true`) only runs *after* that render. For one render cycle: `isLoading = false`, `isAuthenticated = false`. The home screen guard `if (!isLoading && !isAuthenticated)` fires and redirects to `/(tabs)` (login), appearing as an immediate sign-out.

**Fix (in `context/AuthContext.tsx`):**
```javascript
// Was:
const isLoading = !clerkLoaded || !bootDone || initialSyncPending;
// Now:
const isLoading = !clerkLoaded || !bootDone || initialSyncPending || (isSignedIn && !user);
```

**Companion fix:** After all 5 sync retries are exhausted (server down), call `clerk.signOut()` to prevent a permanently stuck loading screen. Without it, `isSignedIn && !user` would stay true forever after a server outage.

**How to apply:** Any change to the `isLoading` calculation or the sync retry loop in `AuthContext.tsx` must preserve both of these invariants.
