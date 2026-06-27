---
name: Enterprise branding for the org feature
description: All user-facing copy for the organization/fleet-team feature is branded "Enterprise"; code/keys/DB stay "org".
---

# "Enterprise" is the user-facing brand name for the org feature

In CTL (car-logbook), the multi-member organization feature is presented to users as **"Enterprise"** in ALL user-facing copy — both English and Arabic. In Arabic the Latin word "Enterprise" is used as a brand term (no Arabic translation like "المؤسسة").

**Why:** The owner (Kash) decided "Enterprise" works as both a brand name and a functional descriptor, and wants it consistent everywhere users see it.

**How to apply:** When adding/editing any user-visible string about orgs:
- i18n values in `artifacts/car-logbook/lib/i18n/locales/{en,ar}.json` (the `org` / `orgActivity` sections, invite banners, enterprise-upgrade copy) → use "Enterprise".
- User-facing API error strings in `artifacts/api-server/src/routes/orgs.ts` (surfaced via `errorMessage(e, fallback)`) → use "enterprise".
- Do NOT rename code-level identifiers, i18n KEY names (keys stay `org.*`), JSON response keys (`organization: org`), or DB tables/columns (`organizationsTable`, `org_id`, etc.). Those stay "org/organization".
