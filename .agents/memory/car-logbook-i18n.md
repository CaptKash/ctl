---
name: Car-logbook i18n / RTL localization
description: How Arabic + RTL localization is done in the car-logbook Expo app, and which fault-log screen is the real one.
---

# Localization pattern (car-logbook Expo app)

- i18n is react-i18next; setup in `lib/i18n/index.ts`. Locale JSON in `lib/i18n/locales/en.json` + `ar.json`, keyed by namespace.
- Language persists in AsyncStorage key `ctl.language`, defaults to English. Switch via Settings → Language, or the `DevLanguageToggle` pill (only in `__DEV__`).
- RTL is **style-driven, not native**: `I18nManager.forceRTL` stays false. Each screen computes `const isRTL = i18n.language === "ar"` and conditionally applies `flexDirection: "row-reverse"`, `textAlign`, and border-side flips (e.g. `borderLeftWidth`↔`borderRightWidth`). Do NOT rely on native RTL.
- Per-screen localization recipe: add `useTranslation`, replace hardcoded strings with `t()`, add a namespace to BOTH en.json and ar.json, and apply the isRTL style flips. Move any module-level helper that needs `t` (e.g. a `carLabel` fallback) inside the component.
- If localized text is derived inside a `useMemo`, add `i18n.language` to its deps so it re-renders on language switch.
- Arabic plural keys: provide `<key>_one` + `<key>_other` for English; Arabic only needs `<key>_other` (i18next falls back to `_other` for all Arabic plural categories). This intentional asymmetry is NOT a parity bug.
- For RESOLVED/ACTIVE style stamps, reset `letterSpacing: 0` in Arabic (letter-spacing breaks Arabic ligatures).
- Dates are NOT localized — shared `lib/dateUtils.formatDate` renders English digits app-wide. Deferred on purpose; changing it affects every screen.

# Fault-log dead-screen gotcha

**The real fault log screen is `app/faults.tsx`** (BottomNav routes `/faults` → it). `app/car/faults.tsx` exists but is UNREACHABLE dead code (no nav references). Earlier localization work was wasted on the dead file. Always confirm a screen is reachable via `components/ui/BottomNav.tsx` / router refs before editing.

**Why:** stylistic/UI edits silently "didn't show up" because the edited file was never navigated to.
**How to apply:** when a UI change "doesn't appear", grep BottomNav + router pushes to find which file actually renders that route.

# Reusable component prop note

`components/ui/EmptyState.tsx` uses prop `description` (NOT `subtitle`). Passing `subtitle` is a silent no-op (renders nothing) and a tsc error.
