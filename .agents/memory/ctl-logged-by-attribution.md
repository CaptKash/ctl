---
name: CTL "Logged by" event attribution scope
description: Which surfaces show member attribution on event cards in enterprise context, and why
---

In org/enterprise context, vehicle event cards show "Logged by {name}" resolved client-side from `createdByUserId` via the `useOrgMemberNames` hook (fetches `/orgs/:orgId/members`, returns null outside org context).

Scope decision — attribution is shown ONLY on vehicle event surfaces: car detail timeline (`app/car/[id].tsx` fault/maintenance/inspection cards), `app/car/maintenance.tsx`, `app/car/faults.tsx`.

**Why:** fuel/history/report screens run in personal/global context where the logger is always self or the column is ambiguous, so a "logged by" line there is redundant or misleading. RecordCard's `metaText` prop is intentionally left unwired in `fuel.tsx` and `report/[id].tsx`.

**How to apply:** when adding attribution or similar per-record member info, gate on activeOrgId AND only on per-vehicle event lists; do not add to personal-context or aggregated/report screens.
