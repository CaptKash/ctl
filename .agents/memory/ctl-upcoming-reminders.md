---
name: CTL upcoming reminder labels
description: Why all maintenance-derived "upcoming" cards share one "Next Service" label, and the repair-vs-service storage constraint behind it.
---

# Upcoming reminder card labels (car-logbook)

All "upcoming" cards derived from the maintenance table — whether logged from the
repair form (`app/maintenance/form.tsx`) or the service form
(`app/car/maintenance.tsx`) — share ONE fixed title: **"Next Service"**.
Inspection-derived cards (from the inspections table) keep "Next Inspection".

**Why:** Kash asked to label repair-generated and service-generated cards
differently, but repair logs and service logs are stored identically in the same
`maintenance_records` table with **no source marker**. `faultId` is used only to
resolve the fault and is NOT persisted on the maintenance row. The only data
signal is that fault-origin repairs have an empty `type` (service logs always
have a type), which cannot distinguish non-fault repairs from services. DB
migrations are off-limits, so a source column can't be added. Given that, Kash
chose a single shared label ("Next Service") over per-source labels.

**How to apply:** Title is fixed client-side by `itemKind === "maintenance"`
(in `home.tsx` `localizedEventType` and in `maintenance/upcoming.tsx`), keyed on
`home.eventType.nextService` (en + ar). Do NOT try to title by the record's
`type`/`description`. Keep the server `item.type` as the real type — it feeds the
maintenance form `preType` on tap from home. Don't reintroduce a
`type: r.type || r.description` fallback in `/maintenance/upcoming`: it would push
a work-description into the form's service-type field, and it does NOT affect
grouping (grouping keys on raw `r.type` before the map).

**Known limitation (pre-existing, out of scope):** upcoming maintenance grouping
key is `carId::type`, so multiple empty-type fault repairs for one car collapse
into a single card (latest wins).
