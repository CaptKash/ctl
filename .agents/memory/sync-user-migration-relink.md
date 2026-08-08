---
name: sync-user stale clerkUserId auto-relink and migration safety
description: How sync-user re-links users after a Clerk tenant migration, and the durable safety rules for bulk/on-demand account migration.
---

# sync-user stale clerkUserId auto-relink

## The rule
When sync-user finds an email in the DB linked to a **different** clerkUserId, it checks whether the old ID still exists in the current Clerk instance (via `CLERK_LOOKUP_SECRET_KEY`). If the old ID returns 404 **and** the incoming email is verified, it re-links to the new clerkUserId. Only a live 200 from the old-ID lookup forces a 409.

**Why:** After migrating to a new Clerk tenant, all production users had stale clerkUserIds. The 409 guard was correct but had no escape valve for legitimate re-links.

---

# Migration marker for orphan identification

## The rule
When creating a Clerk user during migration (bulk or on-demand), always set `public_metadata: { ctl_migration_pending: true }`.

On `form_identifier_exists` (duplicate), look up the Clerk account and check:
- `public_metadata.ctl_migration_pending === true` → our own orphan from a failed previous run; safe to resume
- anything else → pre-existing account we cannot prove belongs to this user; leave unlinked as a conflict

**Why:** `public_metadata` is write-protected by the Clerk secret key — external parties cannot forge this marker. Verification status (verified/unverified) is NOT a safe orphan signal because an attacker can pre-register an unverified account with a victim's email. Only a server-written unforgeable marker is safe.

**How to apply:** Any migration code that calls `POST /users` in Clerk must include the marker. The orphan check must use `=== true` (strict). On successful DB link, explicitly set `ctl_migration_pending: false` (not `{}` — Clerk PATCH is merge semantics; `{}` does not remove the key).

---

# Verification-gated DB linking

## The rule
Only write `clerkUserId` to the local DB row **after** email verification has succeeded (`PATCH /email_addresses/{id} { verified: true }` returns 2xx).

**Why:** A linked but unverified Clerk account locks the user out of both paths: `/auth/login` rejects rows with a non-null `clerkUserId`, and Clerk blocks sign-in for unverified addresses.

**How to apply:** Never treat email verification as optional or non-fatal when the DB link write follows it. Keep DB link strictly after verification, or don't link at all.

---

# Clerk public_metadata merge semantics

Clerk's `PATCH /users/{id}` with `{ public_metadata: {} }` does **not** remove existing keys — it merges. To clear a flag, explicitly set it to false: `{ public_metadata: { ctl_migration_pending: false } }`.
