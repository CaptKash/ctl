---
name: CTL org-context aggregate feeds leak personal data
description: Cross-car aggregate list screens must switch endpoint by activeOrgId or fleet data leaks into enterprise
---

Any car-logbook screen that aggregates records ACROSS cars (not per-car `/cars/:carId/...`) must be made context-aware, or personal/fleet data leaks into the enterprise view (and vice versa).

Pattern: personal endpoint scopes by `carsTable.userId`; add a mirrored org endpoint under `/orgs/:orgId/...` that scopes by `carsTable.orgId` (behind existing `resolveOrgAccess` via `router.param("orgId", ...)`). Client switches on `useOrg().activeOrgId` for BOTH the query key (`activeOrgId ? ["orgs", id, key] : [key]`) and the queryFn URL, and the delete/mutation invalidation must use the same context-aware key.

**Why:** the global feeds default to the personal `/malfunctions`, `/maintenance/upcoming`, etc.; without the activeOrgId switch they show fleet data while the user is in an org. Already fixed for upcoming events and the global Fault Log this way.

**How to apply:** when touching any cross-car aggregate screen, verify the activeOrgId switch exists. Wired so far: home upcoming, global Fault Log, History (faults + maintenance). The report/export screen still uses personal `/malfunctions` + `/maintenance` only — check it if enterprise reports are requested.
