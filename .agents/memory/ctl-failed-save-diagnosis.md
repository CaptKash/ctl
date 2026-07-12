---
name: CTL "Failed to save" diagnosis
description: How to triage generic save-failure reports in CTL; user tests dev app on phone; known error-surface gaps
---

# Triaging "Failed to save. Please try again." reports

- The owner (mkashour) actively tests the **dev** app from his phone (dev web/PWA sessions appear as "Web Bundled" in the Metro log; his test data, e.g. dev user 24 mkashour@gmail.com "Kash", lives in the DEV database). A car visible in a screenshot may not exist in prod — always check which DB holds the record before assuming a prod bug.
- **Why:** Jul 2026 report: renewal save failed on a car that existed only in dev; identical POST+PUT succeeded via curl against both dev and prod. Most likely cause: transient dev-workspace disruption (agent was hot-editing client code at that moment; Metro pushed a broken HMR bundle) — not a server bug.
- **How to apply:** locate the car/user in dev vs prod first; mint a legacy JWT (JWT_SECRET, payload {id,email,name,isAdmin}) and replay the exact client payload against the suspect backend.
- Client error banners are generic and swallow the server message (`parseError` builds a real message but forms show a fixed i18n string); server has **no request logging**, so 4xx failures leave no trace.
- Zod `.parse` throws in route handlers surface as **500** (not 400) with a ZodError stack in workflow logs — a 500 on save usually means invalid payload, not a crash.
- Prod autoscale scales to zero when idle; requests during cold start can fail transiently (healthchecks 500 for ~2s at boot).
- Leftover: 1 test renewal row (id 1, car 57, reviewer demo account) in prod — no DELETE renewals route, prod SQL read-only; harmless demo data.
