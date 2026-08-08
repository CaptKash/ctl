import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Resend } from "resend";
import { db, usersTable } from "@workspace/db";

const router = Router();

const CLERK_API = "https://api.clerk.com/v1";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "CTL App <noreply@inroomstudios.com>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sentinel value stored in `users.password_hash` for accounts that originated
 * in Clerk (Apple/Google sign-in, or any new email signup created via Clerk).
 * The column is NOT NULL today, so we can't store NULL here without a schema
 * migration. Storing a non-bcrypt literal is intentional: bcrypt.compare()
 * against this string always returns false, so legacy /auth/login can never
 * authenticate these users — which is exactly correct, because they sign in
 * through Clerk. Phase 4 of the migration will drop this column entirely.
 */
const CLERK_MANAGED_SENTINEL = "__CLERK_MANAGED__";

/**
 * Admin secret for the /auth/clerk/admin/bulk-migrate endpoint. Must be set
 * in Replit Secrets (ADMIN_SECRET) before the endpoint responds to requests.
 * Without it the endpoint returns 503 — deliberately, so it cannot be probed
 * before the operator is ready.
 */
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? null;

/**
 * Derive the expected JWT `iss` (issuer) URL from the Clerk publishable key.
 * Publishable keys encode the FAPI hostname in base64url after the `pk_test_`
 * / `pk_live_` prefix, followed by a trailing `$`. Stripping the prefix,
 * decoding, and prepending `https://` gives the canonical issuer.
 *
 * Example: pk_test_Y2hhcm1lZC1... → "charmed-garfish-1.clerk.accounts.dev"
 *          → expectedIss = "https://charmed-garfish-1.clerk.accounts.dev"
 */
function expectedClerkIssuer(publishableKey: string): string | null {
  try {
    const b64 = publishableKey.replace(/^pk_(test|live)_/, "");
    const decoded = Buffer.from(b64, "base64url").toString("utf8").replace(/\$$/, "");
    if (!decoded.includes(".")) return null;
    return `https://${decoded}`;
  } catch {
    return null;
  }
}

/**
 * Authentication boundary for `/sync-user`: require a valid Clerk session,
 * but do NOT require a local users row (the whole point of sync-user is to
 * create one). This is intentionally narrower than the dual-auth `requireAuth`
 * in middlewares/auth.ts.
 *
 * Includes an explicit `iss` check: @clerk/express verifies signatures against
 * whichever JWKS the token's own `iss` points to, so without this guard a JWT
 * from any Clerk tenant would pass verification. We hard-reject anything whose
 * issuer doesn't match the FAPI domain encoded in CLERK_PUBLISHABLE_KEY.
 */
function requireClerkSession(req: Request, res: Response, next: NextFunction) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    return res
      .status(503)
      .json({ error: "Clerk authentication is not configured on this server." });
  }

  // Explicit issuer check — must run before trusting auth.userId.
  // CLERK_EXPECTED_ISSUER takes precedence over derivation from CLERK_PUBLISHABLE_KEY
  // so the check works even when CLERK_PUBLISHABLE_KEY still holds a stale value.
  const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (rawToken) {
    try {
      const segment = rawToken.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(segment, "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      const expected =
        process.env.CLERK_EXPECTED_ISSUER ||
        expectedClerkIssuer(process.env.CLERK_PUBLISHABLE_KEY!);
      const actual = payload.iss as string | undefined;
      if (expected && actual !== expected) {
        console.error(
          "[requireClerkSession] ISS MISMATCH — expected:", expected,
          "| got:", actual ?? "NONE",
          "— rejecting token from wrong Clerk tenant",
        );
        return res.status(401).json({ error: "A valid Clerk session is required." });
      }
    } catch {
      // Malformed JWT — let getAuth() handle it below.
    }
  }

  const auth = getAuth(req);
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV !== "production") console.log("[requireClerkSession] auth.userId:", auth?.userId ?? "NULL", "| header prefix:", authHeader ? authHeader.substring(0, 20) + "..." : "MISSING");
  if (!auth?.userId) {
    return res.status(401).json({ error: "A valid Clerk session is required." });
  }
  (req as Request & { clerkUserId?: string }).clerkUserId = auth.userId;
  return next();
}

/**
 * Timing-safe comparison for the ADMIN_SECRET bearer token.
 * Returns false when ADMIN_SECRET is not configured.
 */
function adminSecretValid(header: string | undefined): boolean {
  if (!ADMIN_SECRET || !header) return false;
  const provided = header.replace(/^Bearer\s+/i, "");
  try {
    const a = Buffer.from(ADMIN_SECRET);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification?: { status?: string; strategy?: string };
  }>;
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Thin Clerk Backend API client over fetch. We don't use clerkClient from
 * @clerk/backend here because we want explicit control over response
 * inspection (logging the raw error body when imports fail).
 */
async function clerkApi<T = unknown>(
  path: string,
  init: RequestInit = {},
  secretKeyOverride?: string,
): Promise<{ status: number; body: T | { errors?: unknown } }> {
  const key = secretKeyOverride ?? process.env.CLERK_SECRET_KEY;
  const r = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await r.json().catch(() => ({}))) as T | { errors?: unknown };
  return { status: r.status, body };
}

function pickPrimary(u: ClerkUser) {
  if (!u.email_addresses?.length) return null;
  return (
    u.email_addresses.find((e) => e.id === u.primary_email_address_id) ??
    u.email_addresses[0]
  );
}

function pickPrimaryEmail(u: ClerkUser): string | null {
  return pickPrimary(u)?.email_address?.toLowerCase().trim() ?? null;
}

/**
 * True iff the Clerk user's primary email address is considered verified.
 * We accept either:
 *   - status === "verified"  (email+password and migrated accounts)
 *   - strategy starts with "from_oauth" (Apple/Google — the OAuth provider
 *     itself verified the address, so Clerk may record a non-"verified"
 *     status string while still guaranteeing ownership).
 * This prevents a malicious sign-up with an unverified email from claiming
 * a victim's legacy account.
 */
function isPrimaryEmailVerified(u: ClerkUser): boolean {
  const v = pickPrimary(u)?.verification;
  if (!v) return false;
  if (v.status === "verified") return true;
  if (typeof v.strategy === "string" && v.strategy.startsWith("from_oauth")) return true;
  return false;
}

/**
 * In-memory per-(IP+email) rate limiter for /auth/clerk/migrate. The endpoint
 * is unauthenticated and creates Clerk users + consumes Clerk quota, so it
 * needs a stricter posture than /auth/login. Window resets once empty; max
 * 5 attempts per 15 min per (ip, email). This is a single-process limiter —
 * acceptable because the api-server runs as one node today; if we ever scale
 * horizontally this MUST move to Redis or similar.
 */
const MIGRATE_RATE_WINDOW_MS = 15 * 60 * 1000;
const MIGRATE_RATE_MAX = 5;
const migrateAttempts = new Map<string, number[]>();
function migrateRateAllow(ip: string, email: string): boolean {
  const key = `${ip}|${email.toLowerCase()}`;
  const now = Date.now();
  const cutoff = now - MIGRATE_RATE_WINDOW_MS;
  const recent = (migrateAttempts.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= MIGRATE_RATE_MAX) {
    migrateAttempts.set(key, recent);
    return false;
  }
  recent.push(now);
  migrateAttempts.set(key, recent);
  return true;
}

/**
 * POST /auth/clerk/sync-user
 *
 * Called by the mobile app after a successful Clerk sign-in (any provider)
 * to find-or-create the matching local users row. Returns the local user
 * payload — that numeric `id` is what RevenueCat already uses as appUserID.
 *
 * Lookup order:
 *   1. By `clerk_user_id` (already linked → return immediately, idempotent)
 *   2. By primary email from Clerk (legacy user signing in via Clerk for
 *      the first time → set clerk_user_id and return)
 *   3. Insert a new local row (brand-new Clerk-native signup)
 */
router.post("/auth/clerk/sync-user", requireClerkSession, async (req, res) => {
  const clerkUserId = (req as Request & { clerkUserId?: string }).clerkUserId!;
  try {
    // 1. Fast path: already linked.
    const [linked] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        isAdmin: usersTable.isAdmin,
        passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);
    if (linked) return res.json({ user: linked });

    // 2. Fetch Clerk profile via the FAPI OAuth userinfo endpoint.
    //
    // We intentionally avoid clerkApi(/users/${clerkUserId}) here because
    // that call requires CLERK_SECRET_KEY to point to the exact same Clerk
    // instance the mobile app uses (dev vs prod). In practice the production
    // deployment secret has been difficult to update reliably, so we fall
    // back to Clerk's standard OAuth 2.0 userinfo endpoint instead — it
    // accepts the user's own session token (already present in the request)
    // and returns email + name without any backend secret.
    const rawToken = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    const fapiBase =
      process.env.CLERK_EXPECTED_ISSUER ||
      expectedClerkIssuer(process.env.CLERK_PUBLISHABLE_KEY ?? "");

    type UserInfoPayload = {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      family_name?: string;
    };

    let userInfoData: UserInfoPayload | null = null;
    if (fapiBase && rawToken) {
      try {
        const uiResp = await fetch(`${fapiBase}/oauth/userinfo`, {
          headers: { Authorization: `Bearer ${rawToken}` },
        });
        if (uiResp.ok) {
          userInfoData = (await uiResp.json()) as UserInfoPayload;
        } else {
          console.error("[sync-user] FAPI userinfo status:", uiResp.status);
        }
      } catch (e) {
        console.error("[sync-user] FAPI userinfo fetch error:", e);
      }
    }

    // Fall back to Clerk Backend API if FAPI userinfo failed.
    let email: string | null = null;
    let clerkFirstName: string | null = null;
    let clerkLastName: string | null = null;
    let emailVerified = false;

    if (userInfoData?.email) {
      email = userInfoData.email.toLowerCase().trim();
      emailVerified = userInfoData.email_verified ?? false;
      clerkFirstName = userInfoData.given_name ?? null;
      clerkLastName = userInfoData.family_name ?? null;
    } else {
      // Backend API fallback. CLERK_LOOKUP_SECRET_KEY is a dedicated secret
      // for user lookups — it always uses the shared Replit Secret value and
      // is not overridden by any production-specific deployment secret, unlike
      // CLERK_SECRET_KEY which the Replit deployment environment may override
      // with a live-instance key that doesn't match the dev-instance users.
      const lookupKey =
        process.env.CLERK_LOOKUP_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
      const clerkResp = await clerkApi<ClerkUser>(`/users/${clerkUserId}`, {}, lookupKey);
      if (clerkResp.status >= 400) {
        console.error(
          "[sync-user] Clerk getUser failed:",
          clerkResp.status,
          clerkResp.body,
        );
        return res.status(502).json({ error: "Could not load Clerk profile." });
      }
      const clerkUser = clerkResp.body as ClerkUser;
      email = pickPrimaryEmail(clerkUser);
      emailVerified = isPrimaryEmailVerified(clerkUser);
      clerkFirstName = clerkUser.first_name ?? null;
      clerkLastName = clerkUser.last_name ?? null;
    }

    if (!email) {
      return res.status(400).json({ error: "Clerk account has no email address." });
    }

    // Name source priority:
    //   1. Clerk's first_name/last_name (from userinfo or backend API).
    //   2. Optional `name` in the request body — the mobile signup screen
    //      passes the name the user typed at sign-up time.
    //   3. Email local-part as last-resort fallback.
    const bodyName =
      typeof (req.body as { name?: unknown })?.name === "string"
        ? ((req.body as { name?: string }).name ?? "").trim()
        : "";
    const name =
      [clerkFirstName, clerkLastName].filter(Boolean).join(" ").trim() ||
      bodyName ||
      email.split("@")[0];

    // 3. Match by email — link if unlinked, conflict if cross-linked.
    //    SECURITY: linking a pre-existing local account to a Clerk identity
    //    requires the Clerk-side primary email to be VERIFIED. Without this,
    //    a hostile sign-up with the victim's email (Clerk allows unverified
    //    sessions in some configurations) could silently claim the victim's
    //    legacy account along with all their cars and history.
    const [byEmail] = await db
      .select({ id: usersTable.id, clerkUserId: usersTable.clerkUserId })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    console.error(
      "[sync-user] byEmail:", byEmail
        ? `id=${byEmail.id} storedClerkId=${byEmail.clerkUserId ?? "null"} match=${byEmail.clerkUserId === clerkUserId}`
        : "NOT FOUND"
    );

    if (byEmail) {
      if (byEmail.clerkUserId && byEmail.clerkUserId !== clerkUserId) {
        // Before hard-rejecting, verify the stored clerkUserId still exists in
        // the current Clerk instance. If it returns 404, the account belongs to
        // a retired tenant (e.g. the old Replit-managed Clerk) and re-linking
        // to the new identity is safe — provided the incoming email is verified.
        const lookupKey =
          process.env.CLERK_LOOKUP_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
        const oldUserResp = await clerkApi(`/users/${byEmail.clerkUserId}`, {}, lookupKey);
        console.error(
          "[sync-user] old clerkId check:", byEmail.clerkUserId,
          "→ status:", oldUserResp.status
        );
        if (oldUserResp.status === 404 && emailVerified) {
          // Old identity is gone — re-link to the new Clerk user.
          console.error("[sync-user] re-linking stale clerkUserId →", clerkUserId);
          const [relinked] = await db
            .update(usersTable)
            .set({ clerkUserId })
            .where(eq(usersTable.id, byEmail.id))
            .returning({
              id: usersTable.id,
              name: usersTable.name,
              email: usersTable.email,
              isAdmin: usersTable.isAdmin,
              passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
            });
          if (relinked) {
            console.error("[sync-user] RESPONSE 200 re-linked id=", relinked.id);
            return res.json({ user: relinked });
          }
        }
        console.error("[sync-user] RESPONSE 409 — cross-link conflict");
        return res.status(409).json({
          error: "This email is already linked to a different Clerk account.",
        });
      }
      if (byEmail.clerkUserId === clerkUserId) {
        // Already linked (race or repeat call). Treat as fast-path return.
        const [u] = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            isAdmin: usersTable.isAdmin,
            passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
          })
          .from(usersTable)
          .where(eq(usersTable.id, byEmail.id))
          .limit(1);
        console.error("[sync-user] fast-path u:", u ? `id=${u.id} name=${u.name}` : "UNDEFINED");
        if (u) {
          console.error("[sync-user] RESPONSE 200 fast-path");
          return res.json({ user: u });
        }
      }
      if (!emailVerified) {
        return res.status(403).json({
          error: "Please verify your email with the provider before linking.",
        });
      }
      // Race-safe: only update rows still unlinked. Concurrent sync-user calls
      // for the same Clerk identity will see clerkUserId already set and the
      // conditional UPDATE will affect 0 rows; we then re-read.
      const [updated] = await db
        .update(usersTable)
        .set({ clerkUserId })
        .where(and(eq(usersTable.id, byEmail.id), isNull(usersTable.clerkUserId)))
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          isAdmin: usersTable.isAdmin,
          passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
        });
      if (updated) return res.json({ user: updated });
      // Lost the race — somebody else linked first. Re-read by id and verify
      // it's the same Clerk id we're holding; otherwise it's a cross-link.
      const [reread] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          isAdmin: usersTable.isAdmin,
          passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
          clerkUserId: usersTable.clerkUserId,
        })
        .from(usersTable)
        .where(eq(usersTable.id, byEmail.id))
        .limit(1);
      if (reread?.clerkUserId === clerkUserId) {
        const { clerkUserId: _omit, ...payload } = reread;
        return res.json({ user: payload });
      }
      return res.status(409).json({
        error: "This email is already linked to a different Clerk account.",
      });
    }

    // 4. Brand-new Clerk-native user: insert.
    console.error("[sync-user] reaching INSERT path for email:", email);
    try {
      const [created] = await db
        .insert(usersTable)
        .values({
          name,
          email,
          passwordHash: CLERK_MANAGED_SENTINEL,
          passwordUpgradeRequired: false,
          clerkUserId,
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          isAdmin: usersTable.isAdmin,
          passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
        });
      console.error("[sync-user] RESPONSE 201 INSERT created:", created ? `id=${created.id}` : "UNDEFINED");
      return res.status(201).json({ user: created });
    } catch (err) {
      // Unique-violation race: a concurrent sync-user beat us to the insert.
      // Re-read by clerkUserId and return the winner. Postgres unique-violation
      // SQLSTATE is 23505.
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        const [retry] = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            isAdmin: usersTable.isAdmin,
            passwordUpgradeRequired: usersTable.passwordUpgradeRequired,
          })
          .from(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId))
          .limit(1);
        if (retry) return res.json({ user: retry });
      }
      throw err;
    }
  } catch (err) {
    console.error("[/auth/clerk/sync-user] error:", err);
    return res.status(500).json({ error: "Sync failed. Please try again." });
  }
});

/**
 * POST /auth/clerk/migrate
 *
 * Called by the mobile app on a legacy user's first sign-in attempt against
 * the new Clerk-backed login screen. Validates the user's existing
 * email+password against our legacy bcrypt hash; if valid, silently creates
 * them in Clerk by importing the bcrypt digest (no password reset required),
 * marks their email verified, and links clerk_user_id on their local row.
 *
 * From the user's POV: they typed their old password into the new login
 * screen and it worked. Behind the scenes we moved them into Clerk.
 *
 * Unauthenticated by design — the caller has neither a Clerk session
 * (account doesn't exist there yet) nor a legacy JWT (the new build doesn't
 * mint legacy JWTs anymore).
 */
router.post("/auth/clerk/migrate", async (req, res) => {
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    return res
      .status(503)
      .json({ error: "Clerk authentication is not configured on this server." });
  }
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Rate-limit BEFORE doing any DB or Clerk work. Trust express's req.ip
    // (api-server sets trust proxy as needed in app.ts).
    const ip = req.ip ?? "unknown";
    if (!migrateRateAllow(ip, normalizedEmail)) {
      return res.status(429).json({
        error: "Too many attempts. Please wait a few minutes and try again.",
      });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    // Use the same generic error string as /auth/login so we don't leak
    // account existence to a probing attacker.
    const GENERIC = { error: "Invalid email or password." };

    if (!user) return res.status(401).json(GENERIC);
    if (user.passwordHash === CLERK_MANAGED_SENTINEL) {
      // Clerk-native account — password verification must go through Clerk.
      return res.status(401).json(GENERIC);
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json(GENERIC);

    if (user.clerkUserId) {
      // Already migrated — caller should just sign into Clerk directly with
      // the same password. This branch returns 409 (not 401) because the
      // password WAS correct; only the action requested is wrong.
      return res.status(409).json({
        error: "This account has already been migrated. Please sign in normally.",
        alreadyMigrated: true,
      });
    }

    // Import into Clerk preserving the existing bcrypt hash (verified
    // viable by the Phase 2 spike: Clerk accepts $2b$10$ digests via
    // password_hasher: "bcrypt").
    const nameParts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    // Tag the newly created user with an unforgeable server-side marker.
    // public_metadata can only be written via the Clerk secret key, so an
    // external party cannot forge this field. If a later step fails and the
    // Clerk user persists, a subsequent call to this endpoint (or the bulk
    // migration) can safely identify it as our own creation-time orphan.
    const created = await clerkApi<ClerkUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [normalizedEmail],
        password_digest: user.passwordHash,
        password_hasher: "bcrypt",
        skip_password_checks: true,
        first_name: firstName,
        last_name: lastName,
        public_metadata: MIGRATION_MARKER,
      }),
    });

    let clerkUser: ClerkUser;
    if (created.status === 200 || created.status === 201) {
      clerkUser = created.body as ClerkUser;
    } else if (created.status === 422 || created.status === 400) {
      const errs = (created.body as { errors?: Array<{ code?: string }> })?.errors;
      const codes = (errs ?? []).map((e) => e.code);
      const isDup =
        codes.includes("form_identifier_exists") ||
        codes.includes("form_identifier_exists_verification");
      if (!isDup) {
        console.error(
          "[migrate] Clerk createUser failed (non-dup):",
          created.status,
          created.body,
        );
        return res.status(502).json({ error: "Could not create Clerk account." });
      }

      // Duplicate: look up the existing account and check for our migration
      // marker. This is unforgeable — only the Clerk secret key can set
      // public_metadata, so a third party cannot poison this signal.
      const lookup = await clerkApi<Array<ClerkUser & { public_metadata?: Record<string, unknown> }>>(
        `/users?email_address=${encodeURIComponent(normalizedEmail)}`,
      );
      const existingClerkUser = Array.isArray(lookup.body) ? lookup.body[0] : undefined;
      if (lookup.status >= 400 || !existingClerkUser) {
        console.error("[migrate] Clerk lookup-after-dup failed:", lookup.status);
        return res.status(502).json({ error: "Could not look up existing Clerk account." });
      }

      const hasMigrationMarker =
        (existingClerkUser as { public_metadata?: Record<string, unknown> })
          .public_metadata?.ctl_migration_pending === true;

      if (!hasMigrationMarker) {
        // No marker: the existing account was NOT created by our migration.
        // We cannot safely link it to this legacy user — doing so could
        // expose their data to whoever controls that Clerk account.
        console.error(
          "[migrate] Clerk account exists without migration marker for", normalizedEmail,
          "— directing user to sign in via Clerk",
        );
        return res.status(409).json({
          error: "An account with this email already exists in Clerk. Please sign in using the new sign-in screen, or use 'Forgot Password' if you don't remember your Clerk password.",
          alreadyMigrated: true,
        });
      }

      // Our own orphan from a previous failed migration run.
      // The user has also proven knowledge of their legacy password.
      console.error(
        "[migrate] Migration-marked orphan found for", normalizedEmail,
        "— resuming verify + link",
      );
      clerkUser = existingClerkUser as ClerkUser;
    } else {
      console.error(
        "[migrate] Clerk createUser failed:",
        created.status,
        created.body,
      );
      return res.status(502).json({ error: "Could not create Clerk account." });
    }

    // Mark the primary email verified. This MUST succeed before we write
    // clerkUserId to the local row — without it /auth/login is blocked
    // (rejects rows with a clerkUserId) while Clerk may block sign-in for
    // unverified addresses, leaving the user locked out of both paths.
    // On failure, the Clerk user persists with the marker so the next attempt
    // can resume (marker identifies it as our orphan, not a foreign account).
    const emailId = clerkUser.email_addresses?.[0]?.id;
    if (!emailId) {
      console.error("[migrate] Clerk user has no email address record — cannot verify; marker left for retry");
      return res.status(502).json({
        error: "Could not verify your Clerk account email. Please try again.",
      });
    }
    const verifyResp = await clerkApi(`/email_addresses/${emailId}`, {
      method: "PATCH",
      body: JSON.stringify({ verified: true }),
    });
    if (verifyResp.status >= 400) {
      console.error(
        "[migrate] Failed to mark Clerk email verified — not linking (marker left for retry):",
        verifyResp.status,
        verifyResp.body,
      );
      return res.status(502).json({
        error: "Could not verify your Clerk account email. Please try again or use 'Forgot Password'.",
      });
    }

    // Link the local row to the new Clerk user — only after verification
    // has been confirmed, so legacy /auth/login remains usable on failure.
    await db
      .update(usersTable)
      .set({ clerkUserId: clerkUser.id })
      .where(eq(usersTable.id, user.id));

    // Clear the migration marker. Clerk's public_metadata PATCH is merge
    // semantics — {} would not remove the key. Explicitly set it to false so
    // a future run cannot mistake this fully-linked account for a resumable
    // orphan. The orphan check uses === true, so false is safe. Non-fatal.
    await clerkApi(`/users/${clerkUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({ public_metadata: { ctl_migration_pending: false } }),
    }).catch((e) => console.warn("[migrate] marker cleanup failed (non-fatal):", e));

    return res.json({ migrated: true });
  } catch (err) {
    console.error("[/auth/clerk/migrate] error:", err);
    return res.status(500).json({ error: "Migration failed. Please try again." });
  }
});

/**
 * GET /auth/clerk/config
 *
 * Public endpoint returning this server's Clerk publishable key (publishable
 * keys are public by design). Used to read the production (pk_live) key that
 * Replit injects only into the deployment environment, so mobile builds can
 * be compiled against the correct Clerk tenant.
 */
router.get("/auth/clerk/config", (_req, res) => {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return res.status(503).json({ error: "Clerk is not configured on this server." });
  }
  return res.json({ publishableKey });
});

// ── Bulk migration ─────────────────────────────────────────────────────────

/**
 * One record in the per-user result log returned by bulkMigrateToClerk.
 *
 * `outcome`:
 *   "created"  — user was created in Clerk, verified, and linked in the local DB.
 *   "conflict" — a Clerk account already existed for this email AND its email was
 *                already verified (cannot safely prove it belongs to this legacy
 *                user in a bulk context; local row left unlinked for manual review).
 *   "failed"   — any other error; local row left unlinked so legacy /auth/login
 *                still works and the run can be retried.
 */
export interface MigrationUserResult {
  id: number;
  email: string;
  outcome: "created" | "conflict" | "failed";
  clerkUserId?: string;
  error?: string;
  emailSent: boolean;
}

/**
 * Notification email sent to each successfully migrated user. Explains that
 * their account is ready for the new CTL build and that their existing
 * password still works — or they can use "Forgot Password" to set a new one.
 */
function buildMigrationEmail(name: string): string {
  const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
  <div style="margin-bottom:24px">
    <span style="font-size:28px;font-weight:800;color:#0F2D5E;letter-spacing:-1px">CTL</span>
    <div style="display:inline-block;width:48px;height:4px;background:#1D4ED8;border-radius:2px;vertical-align:middle;margin-left:8px"></div>
    <div style="display:inline-block;width:20px;height:4px;background:#0891B2;border-radius:2px;vertical-align:middle;margin-left:4px"></div>
  </div>
  <h2 style="font-size:20px;font-weight:700;color:#0F2D5E;margin:0 0 12px">Your CTL account is ready</h2>
  <p style="color:#374151;line-height:1.6;margin:0 0 16px">Hi ${safeName},</p>
  <p style="color:#374151;line-height:1.6;margin:0 0 16px">
    We've upgraded CTL to a new sign-in system. Your account and all your car history have been moved over automatically — nothing is lost.
  </p>
  <p style="color:#374151;line-height:1.6;margin:0 0 24px">
    <strong>Your existing password still works.</strong> Just open the app and sign in with your email and password as usual. If you've forgotten your password, tap <em>Forgot Password</em> on the sign-in screen and we'll send you a reset link.
  </p>
  <div style="background:#F0F4FF;border-radius:8px;padding:16px;margin-bottom:24px">
    <p style="margin:0;color:#1D4ED8;font-size:14px;font-weight:600">What changed?</p>
    <ul style="margin:8px 0 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8">
      <li>Sign in with Google or Apple (in addition to email &amp; password)</li>
      <li>More secure session management</li>
      <li>All your cars and maintenance history are intact</li>
    </ul>
  </div>
  <p style="color:#6B7280;font-size:13px;margin:0">Questions? Reply to this email and we'll help.</p>
</div>`.trim();
}

/**
 * Marker written to Clerk `public_metadata` when we create a user in the
 * bulk migration. Because `public_metadata` is write-protected by the Clerk
 * secret key, an external party cannot forge this field. On a subsequent run
 * that finds `form_identifier_exists`, we look for this marker to distinguish
 * our own creation-time orphans (safe to resume) from pre-existing accounts
 * that belong to someone else (leave unlinked as a conflict).
 */
const MIGRATION_MARKER = { ctl_migration_pending: true } as const;

/**
 * Core migration logic shared by the admin HTTP endpoint and the standalone
 * CLI script (`src/scripts/bulk-migrate-clerk.ts`).
 *
 * For each local user without a `clerk_user_id`:
 *  1. Creates the user in Clerk with `public_metadata.ctl_migration_pending=true`,
 *     importing the existing bcrypt hash so the user's current password works.
 *  2. On `form_identifier_exists`: looks up the Clerk account by email and
 *     checks for the unforgeable `ctl_migration_pending` marker.
 *     - Marker present → our own orphan from a previous partial run; proceeds.
 *     - Marker absent → pre-existing account that cannot safely be linked;
 *       records as a conflict and leaves the local row unlinked.
 *  3. Marks the Clerk-side email address as verified.
 *  4. Writes the new `clerk_user_id` into the local `users` row (only after
 *     verification succeeds, preserving legacy /auth/login on any failure).
 *  5. Clears the `ctl_migration_pending` marker (non-fatal if it fails).
 *  6. Sends a "your account is ready" notification via Resend.
 *
 * Returns a structured result log; never throws.
 */
export async function bulkMigrateToClerk(opts: {
  /** Only process emails in this set; leave empty to process all unlinked users. */
  emailFilter?: Set<string>;
  /** Dry-run: skip DB writes and email sends. */
  dryRun?: boolean;
}): Promise<{
  total: number;
  created: number;
  conflicts: number;
  failed: number;
  emailsSent: number;
  results: MigrationUserResult[];
}> {
  const { emailFilter, dryRun = false } = opts;

  // Fetch all users that still lack a Clerk ID and use a real bcrypt hash.
  const candidates = await db
    .select()
    .from(usersTable)
    .where(isNull(usersTable.clerkUserId));

  const users = candidates.filter(
    (u) =>
      u.passwordHash !== CLERK_MANAGED_SENTINEL &&
      (!emailFilter || emailFilter.has(u.email.toLowerCase())),
  );

  const results: MigrationUserResult[] = [];
  let created = 0;
  let conflicts = 0;
  let failed = 0;
  let emailsSent = 0;

  for (const user of users) {
    const rec: MigrationUserResult = {
      id: user.id,
      email: user.email,
      outcome: "failed",
      emailSent: false,
    };

    if (dryRun) {
      // Dry run: perform read-only Clerk checks so the report reflects what
      // the live run would actually encounter (new account, resumable orphan,
      // or foreign-account conflict). No writes to Clerk or the DB, no emails.
      try {
        type ClerkUserMin = {
          id: string;
          public_metadata?: Record<string, unknown>;
        };
        const lookup = await clerkApi<ClerkUserMin[]>(
          `/users?email_address=${encodeURIComponent(user.email)}`,
        );
        if (lookup.status >= 400) {
          rec.error = `[dry-run] Clerk lookup failed (status ${lookup.status})`;
          console.error(`[bulk-migrate][DRY RUN] FAIL ${user.email}: ${rec.error}`);
          failed++;
        } else {
          const existing = Array.isArray(lookup.body) ? lookup.body[0] : undefined;
          if (!existing) {
            // No Clerk account — live run would create.
            rec.outcome = "created";
            rec.clerkUserId = "[would create]";
            created++;
            console.error(`[bulk-migrate][DRY RUN] WOULD CREATE ${user.email}`);
          } else if (existing.public_metadata?.ctl_migration_pending === true) {
            // Our own orphan — live run would resume.
            rec.outcome = "created";
            rec.clerkUserId = `[orphan resume: ${existing.id}]`;
            created++;
            console.error(`[bulk-migrate][DRY RUN] WOULD RESUME ORPHAN ${user.email} → ${existing.id}`);
          } else {
            // Foreign account — live run would conflict.
            rec.outcome = "conflict";
            rec.error = `[dry-run] Clerk account exists without migration marker — would conflict`;
            console.error(`[bulk-migrate][DRY RUN] WOULD CONFLICT ${user.email}: ${existing.id}`);
            conflicts++;
          }
        }
      } catch (err) {
        rec.error = `[dry-run] ${String(err)}`;
        console.error(`[bulk-migrate][DRY RUN] FAIL ${user.email}:`, err);
        failed++;
      }
      results.push(rec);
      continue;
    }

    try {
      const nameParts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] ?? undefined;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      type ClerkUserMin = {
        id: string;
        email_addresses: Array<{ id: string }>;
        public_metadata?: Record<string, unknown>;
      };

      // ── Step 1: create the Clerk account ─────────────────────────────
      // We tag the newly created user with an unforgeable server-side marker
      // (public_metadata can only be written via the Clerk secret key).
      // If any later step fails and this Clerk user remains, the next run can
      // safely identify it as our own orphan rather than a foreign account.
      const createResp = await clerkApi<ClerkUserMin>("/users", {
        method: "POST",
        body: JSON.stringify({
          email_address: [user.email],
          password_digest: user.passwordHash,
          password_hasher: "bcrypt",
          skip_password_checks: true,
          first_name: firstName,
          last_name: lastName,
          public_metadata: MIGRATION_MARKER,
        }),
      });

      let clerkUserId: string;

      if (createResp.status === 200 || createResp.status === 201) {
        clerkUserId = (createResp.body as ClerkUserMin).id;
      } else if (createResp.status === 422 || createResp.status === 400) {
        const errs = (createResp.body as { errors?: Array<{ code?: string }> })?.errors ?? [];
        const isDup = errs.some((e) =>
          e.code === "form_identifier_exists" ||
          e.code === "form_identifier_exists_verification",
        );
        if (!isDup) {
          rec.error = `Clerk createUser ${createResp.status}: ${JSON.stringify(errs)}`;
          console.error(`[bulk-migrate] FAIL ${user.email}: ${rec.error}`);
          results.push(rec);
          failed++;
          continue;
        }

        // Duplicate: look up the existing account and check for our marker.
        // An attacker cannot set public_metadata without the Clerk secret key,
        // so this is an unforgeable ownership signal.
        const lookup = await clerkApi<ClerkUserMin[]>(
          `/users?email_address=${encodeURIComponent(user.email)}`,
        );
        const existing = Array.isArray(lookup.body) ? lookup.body[0] : undefined;
        if (!existing) {
          rec.error = `Duplicate detected but Clerk lookup returned nothing (status ${lookup.status})`;
          console.error(`[bulk-migrate] FAIL ${user.email}: ${rec.error}`);
          results.push(rec);
          failed++;
          continue;
        }

        if (existing.public_metadata?.ctl_migration_pending !== true) {
          // No marker — this account was not created by our migration.
          // Linking it would expose data to whoever controls that account.
          rec.outcome = "conflict";
          rec.error = `Clerk account exists but lacks migration marker — cannot safely link; left unlinked for manual review`;
          console.error(`[bulk-migrate] CONFLICT ${user.email}: ${rec.error}`);
          results.push(rec);
          conflicts++;
          continue;
        }

        // Our own orphan from a previous failed run — safe to resume.
        console.error(`[bulk-migrate] Resuming orphan for ${user.email}: ${existing.id}`);
        clerkUserId = existing.id;
      } else {
        rec.error = `Clerk createUser unexpected status ${createResp.status}`;
        console.error(`[bulk-migrate] FAIL ${user.email}: ${rec.error}`);
        results.push(rec);
        failed++;
        continue;
      }

      // ── Step 2: mark email verified ───────────────────────────────────
      // DB link is only written after this succeeds; on failure the local
      // row stays unlinked so /auth/login continues to work. The marker on
      // the Clerk user ensures the next run can resume rather than conflict.
      const clerkUserResp = await clerkApi<ClerkUserMin>(`/users/${clerkUserId}`);
      const emailId = (clerkUserResp.body as ClerkUserMin)?.email_addresses?.[0]?.id;
      if (!emailId) {
        rec.error = `Could not retrieve email ID from Clerk for user ${clerkUserId}`;
        console.error(`[bulk-migrate] FAIL ${user.email}: ${rec.error} — marker left for next retry`);
        results.push(rec);
        failed++;
        continue;
      }

      const verifyResp = await clerkApi(`/email_addresses/${emailId}`, {
        method: "PATCH",
        body: JSON.stringify({ verified: true }),
      });
      if (verifyResp.status >= 400) {
        rec.error = `Email verification failed (Clerk status ${verifyResp.status}) — marker left for next retry`;
        console.error(`[bulk-migrate] FAIL ${user.email}: ${rec.error}`);
        results.push(rec);
        failed++;
        continue;
      }

      // ── Step 3: commit the local DB link ─────────────────────────────
      await db
        .update(usersTable)
        .set({ clerkUserId })
        .where(eq(usersTable.id, user.id));

      // ── Step 4 (cleanup): clear the migration marker ─────────────────
      // Clerk's public_metadata PATCH uses merge semantics — sending {} does
      // NOT remove existing keys. We must explicitly set ctl_migration_pending
      // to false so that a later run cannot mistake this fully-migrated Clerk
      // account for a resumable orphan. Non-fatal: even if this fails, the
      // user is linked in the DB; the marker value is checked with === true
      // so the downgraded false value will not match.
      await clerkApi(`/users/${clerkUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ public_metadata: { ctl_migration_pending: false } }),
      }).catch((e) => console.warn(`[bulk-migrate] WARN ${user.email}: marker cleanup failed (non-fatal)`, e));

      rec.clerkUserId = clerkUserId;
      rec.outcome = "created";
      created++;

      // ── Step 4: send notification email (non-fatal) ──────────────────
      if (resend) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: "Your CTL account is ready for the new app",
            html: buildMigrationEmail(user.name ?? "there"),
          });
          rec.emailSent = true;
          emailsSent++;
        } catch (emailErr) {
          console.warn(`[bulk-migrate] WARN ${user.email}: email send failed (non-fatal)`, emailErr);
        }
      }

      console.error(
        `[bulk-migrate] CREATED ${user.email} → ${clerkUserId}${rec.emailSent ? " ✉" : ""}`,
      );
    } catch (err) {
      rec.error = String(err);
      console.error(`[bulk-migrate] FAIL ${user.email}: unexpected error`, err);
      failed++;
    }

    results.push(rec);
  }

  return {
    total: users.length,
    created,
    conflicts,
    failed,
    emailsSent,
    results,
  };
}

/**
 * POST /auth/clerk/admin/bulk-migrate
 *
 * One-shot admin endpoint that imports all legacy users (no clerk_user_id)
 * into the charmed-garfish-1 Clerk instance and sends each a notification
 * email. Protected by ADMIN_SECRET (same secret used by /auth/admin/*).
 *
 * Query params:
 *   ?dryRun=true   — simulate without writing to DB or sending email
 *   ?emails=a@b.com,c@d.com  — restrict to a comma-separated list of emails
 *
 * The operation is idempotent: running it twice on the same set of users
 * is safe (already-migrated users are skipped on the second run because
 * their clerk_user_id is now set).
 */
router.post("/auth/clerk/admin/bulk-migrate", async (req, res) => {
  if (!ADMIN_SECRET) {
    return res.status(503).json({ error: "Admin endpoints are not configured on this server." });
  }
  if (!adminSecretValid(req.headers.authorization)) {
    return res.status(401).json({ error: "Invalid or missing admin secret." });
  }
  if (!process.env.CLERK_SECRET_KEY) {
    return res.status(503).json({ error: "Clerk is not configured on this server." });
  }

  const dryRun = req.query.dryRun === "true";
  const emailsParam = typeof req.query.emails === "string" ? req.query.emails : "";
  const emailFilter = emailsParam
    ? new Set(emailsParam.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))
    : undefined;

  console.error(
    `[bulk-migrate] Starting — dryRun=${dryRun}${emailFilter ? ` emails=[${[...emailFilter].join(",")}]` : ""}`,
  );

  const summary = await bulkMigrateToClerk({ emailFilter, dryRun });

  console.error(
    `[bulk-migrate] Done — total=${summary.total} created=${summary.created} ` +
    `conflicts=${summary.conflicts} failed=${summary.failed} emails=${summary.emailsSent}`,
  );

  return res.json(summary);
});

export default router;
export { CLERK_MANAGED_SENTINEL };
