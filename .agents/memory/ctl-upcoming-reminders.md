---
name: CTL upcoming reminder labels
description: The (counter-intuitive) mapping from record source to upcoming-card title that Kash explicitly chose.
---

# Upcoming reminder card labels (car-logbook)

Kash's FINAL chosen titles (note: deliberately counter-intuitive — implement as
stated, do not "correct" the wording):
- `itemKind === "maintenance"` (repair/service logged into `maintenance_records`,
  i.e. has a `next_due_date`) → titled **"Next Inspection"**.
- `itemKind === "inspection"` (logged into `inspection_records`, has a
  `next_inspection_date`) → titled **"Next Service"**.
- license/insurance cards keep their own titles (rendered via `item.type`).

**Why:** Kash's reasoning — a maintenance card already shows the specific repair
that was done, so its follow-up date reads as a "Next Inspection"; an
inspection-sourced card is generic, so it reads as "Next Service". This reverses
an earlier interim decision (where maintenance→"Next Service"); the swap above is
the current intent.

**How to apply:** the two label sites are `home.tsx` `localizedEventType` and
`maintenance/upcoming.tsx` card-title ternary. Both key on `itemKind` and reuse
the i18n keys `home.eventType.nextInspection` / `home.eventType.nextService`
(en + ar) — the key NAMES are now swapped relative to the displayed itemKind, so
go by itemKind, not the key name. Keep the server `item.type` as the real type
(feeds maintenance form `preType` on tap). Don't reintroduce a
`type: r.type || r.description` fallback in `/maintenance/upcoming`: it would push
a work-description into the form's service-type field, and it does NOT affect
grouping (grouping keys on raw `r.type` before the map).

**Known limitation (pre-existing, out of scope):** upcoming maintenance grouping
key is `carId::type`, so multiple empty-type fault repairs for one car collapse
into a single card (latest wins).

## Two repair entry points (easy to miss one)

Repairs can be logged from TWO screens, both POST to `/cars/:id/maintenance`:
1. `app/maintenance/form.tsx` (Maintenance quick action + fault "repair" button).
2. `app/inspection/type.tsx` in **repair mode** (Home → Log Event → Inspection;
   this screen has both repair and inspection modes).

**Trap:** `inspection/type.tsx` repair mode used to write the repair's next date
by making a SECOND POST to `/cars/:id/inspections` in `onSuccess`, creating a
spurious `inspection_records` row that showed up as a "Next Inspection" upcoming
card. The correct behavior (matching `maintenance/form.tsx`) is to send
`nextDueDate` on the maintenance POST and NOT touch `/inspections`.

**How to apply:** when changing repair/next-date behavior, update BOTH entry
points. Spurious inspection rows from the old bug are identifiable as
`inspection_records` with empty place/results/cost and only `next_inspection_date`
set.

## Inspection "Results" selector = 2 options (Kash's choice)

The inspection ("service") Results selector is **two** options, not Pass/Marginal/Fail:
- **"No findings"** (green) — no follow-up.
- **"Repair required"** (red) — shows the "Log a fault" button → `/malfunction/log`.

**Why:** Kash reframed inspection results around whether a repair is needed.
**How to apply:** lives in BOTH `inspection/type.tsx` and `inspection/form.tsx`
(shared i18n `inspection.results.noFindings` / `repairRequired`, en+ar). Values
are stored raw in `inspection_records.results` and shown raw in `car/[id].tsx`
(no migration), so legacy rows still read Pass/Marginal/Fail — leave them. The
fault-prompt condition keys on `results === "Repair required"`.

**Fault prompt = AFTER save, not inline.** Selecting "Repair required" must NOT
navigate away before the service is logged. There is no inline "Log a fault"
button anymore; instead the inspection mutation `onSuccess` (in both files) shows
`Alert.alert(t("inspection.faultPrompt.*"))` only when `results === "Repair
required"` — "Log a fault" → `router.replace("/malfunction/log", {carId,
carName})`, "Not now" → `router.replace("/car/[id]")` — with an early return so
the default car-screen nav doesn't also fire. Non-repair path keeps the plain
replace to car detail. (Old approach lost the service log; do not reintroduce it.)
