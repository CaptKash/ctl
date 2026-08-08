#!/usr/bin/env tsx
/**
 * Standalone CLI wrapper for bulkMigrateToClerk.
 *
 * Usage (must have DATABASE_URL and CLERK_SECRET_KEY in env):
 *
 *   # Dry run — prints what would happen without touching anything:
 *   pnpm --filter @workspace/api-server run migrate:clerk -- --dry-run
 *
 *   # Full migration (all unlinked users):
 *   pnpm --filter @workspace/api-server run migrate:clerk
 *
 *   # Restrict to specific emails:
 *   pnpm --filter @workspace/api-server run migrate:clerk -- --emails=a@b.com,c@d.com
 *
 * To run against the PRODUCTION database, prefix with the production
 * DATABASE_URL (obtainable from the Replit deployment environment):
 *
 *   DATABASE_URL="postgres://..." CLERK_SECRET_KEY="sk_live_..." \
 *     pnpm --filter @workspace/api-server run migrate:clerk
 *
 * Alternatively, trigger the HTTP endpoint on the deployed API server:
 *
 *   curl -X POST https://<deploy-host>/api/auth/clerk/admin/bulk-migrate \
 *        -H "Authorization: Bearer $ADMIN_SECRET"
 *
 * For a dry run via HTTP:
 *   curl -X POST https://<deploy-host>/api/auth/clerk/admin/bulk-migrate?dryRun=true \
 *        -H "Authorization: Bearer $ADMIN_SECRET"
 *
 * ## Partial-failure recovery (marker-based)
 *
 * Each user created in Clerk is tagged with `public_metadata.ctl_migration_pending=true`.
 * This marker is unforgeable by external parties (only writable via the Clerk secret key).
 * If any post-creation step fails (email verification or DB link), the Clerk user is
 * intentionally left in place WITH the marker so the next run can identify and resume it.
 *
 * On `form_identifier_exists`, the migration checks `public_metadata.ctl_migration_pending`:
 *   - true  → our own orphan; safe to resume verification + link
 *   - false or absent → a pre-existing account that doesn't belong to our migration;
 *             reported as a CONFLICT and left unlinked for manual review
 *
 * After a successful DB link, the marker is set to false (Clerk PATCH is merge semantics;
 * {} would leave the key; setting false is how we clear it while keeping === true as the
 * match condition so it cannot be confused with a completed migration).
 *
 * ## Conflicts
 *
 * Conflicts (Clerk accounts without the migration marker) are reported in the summary.
 * Users can self-service these via /auth/clerk/migrate (which requires proving knowledge
 * of their legacy password). If the conflict account is actually theirs, they can use
 * "Forgot Password" on the new sign-in screen to regain access.
 */

import { bulkMigrateToClerk } from "../routes/clerkAuth.js";

// Parse CLI args.
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const emailsArg = args.find((a) => a.startsWith("--emails="));
const emailFilter = emailsArg
  ? new Set(
      emailsArg
        .replace("--emails=", "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    )
  : undefined;

if (!process.env.CLERK_SECRET_KEY) {
  console.error("ERROR: CLERK_SECRET_KEY is not set. Aborting.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

console.log(
  `\nCTL → Clerk bulk migration` +
    (dryRun ? " [DRY RUN]" : "") +
    (emailFilter ? ` (${emailFilter.size} email(s))` : " (all unlinked users)") +
    "\n",
);

bulkMigrateToClerk({ emailFilter, dryRun })
  .then((summary) => {
    console.log("\n── Summary ──────────────────────────────────");
    console.log(`Total candidates  : ${summary.total}`);
    console.log(`Created in Clerk  : ${summary.created}`);
    console.log(`Conflicts         : ${summary.conflicts}`);
    console.log(`Failed            : ${summary.failed}`);
    console.log(`Notification emails sent: ${summary.emailsSent}`);
    console.log("─────────────────────────────────────────────\n");

    if (summary.conflicts > 0) {
      console.log("Conflicts (Clerk accounts without migration marker — manual review needed):");
      for (const r of summary.results.filter((r) => r.outcome === "conflict")) {
        console.log(`  [${r.id}] ${r.email}: ${r.error ?? "conflict"}`);
      }
      console.log();
    }

    if (summary.failed > 0) {
      console.log("Failed accounts (Clerk user retained with marker for next retry):");
      for (const r of summary.results.filter((r) => r.outcome === "failed")) {
        console.log(`  [${r.id}] ${r.email}: ${r.error ?? "unknown error"}`);
      }
    }

    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
