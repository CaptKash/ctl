import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";

const router = Router();

const CLERK_API = "https://api.clerk.com/v1";

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
 * Authentication boundary for `/sync-user`: require a valid Clerk session,
 * but do NOT require a local users row (the whole point of sync-user is to
 * create one). This is intentionally narrower than the dual-auth `requireAuth`
 * in middlewares/auth.ts.
 */
function requireClerkSession(req: Request, res: Response, next: NextFunction) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    return res
      .status(503)
      .json({ error: "Clerk authentication is not configured on this server." });
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
): Promise<{ status: number; body: T | { errors?: unknown } }> {
  const r = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
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

    // 2. Fetch Clerk profile (authoritative email + name).
    const clerkResp = await clerkApi<ClerkUser>(`/users/${clerkUserId}`);
    if (clerkResp.status >= 400) {
      console.error(
        "[sync-user] Clerk getUser failed:",
        clerkResp.status,
        clerkResp.body,
      );
      return res.status(502).json({ error: "Could not load Clerk profile." });
    }
    const clerkUser = clerkResp.body as ClerkUser;
    const email = pickPrimaryEmail(clerkUser);
    if (!email) {
      return res.status(400).json({ error: "Clerk account has no email address." });
    }
    // Name source priority:
    //   1. Clerk's first_name/last_name (set when the Clerk instance has the
    //      name fields enabled in its sign-up schema).
    //   2. Optional `name` in the request body — the mobile signup screen
    //      passes the name the user typed at sign-up time. Used because the
    //      Replit-managed Clerk instance does NOT accept first/last name on
    //      signUp.create, so we'd otherwise lose the user's typed name.
    //   3. Email local-part as last-resort fallback.
    const bodyName =
      typeof (req.body as { name?: unknown })?.name === "string"
        ? ((req.body as { name?: string }).name ?? "").trim()
        : "";
    const name =
      [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ").trim() ||
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

    if (byEmail) {
      if (byEmail.clerkUserId && byEmail.clerkUserId !== clerkUserId) {
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
        if (u) return res.json({ user: u });
      }
      if (!isPrimaryEmailVerified(clerkUser)) {
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

    const created = await clerkApi<ClerkUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [normalizedEmail],
        password_digest: user.passwordHash,
        password_hasher: "bcrypt",
        skip_password_checks: true,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    let clerkUser: ClerkUser;
    if (created.status === 200 || created.status === 201) {
      clerkUser = created.body as ClerkUser;
    } else if (created.status === 422 || created.status === 400) {
      // Idempotency recovery: a previous attempt may have created the Clerk
      // user but failed before linking the local row (network / crash /
      // concurrent retry). Look up by email and proceed to link instead of
      // failing with 502.
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
      const lookup = await clerkApi<ClerkUser[]>(
        `/users?email_address=${encodeURIComponent(normalizedEmail)}`,
      );
      const existing = Array.isArray(lookup.body) ? lookup.body[0] : undefined;
      if (lookup.status >= 400 || !existing) {
        console.error(
          "[migrate] Clerk lookup-after-conflict failed:",
          lookup.status,
          lookup.body,
        );
        return res.status(502).json({ error: "Could not link Clerk account." });
      }
      clerkUser = existing;
    } else {
      console.error(
        "[migrate] Clerk createUser failed:",
        created.status,
        created.body,
      );
      return res.status(502).json({ error: "Could not create Clerk account." });
    }

    // Mark the primary email verified — per locked decision: long-tenured
    // legacy users have proven email ownership through working forgot-password
    // flows. Non-fatal: if Clerk rejects the verify call the user can still
    // verify via the standard email-code flow on next login.
    const emailId = clerkUser.email_addresses?.[0]?.id;
    if (emailId) {
      const verifyResp = await clerkApi(`/email_addresses/${emailId}`, {
        method: "PATCH",
        body: JSON.stringify({ verified: true }),
      });
      if (verifyResp.status >= 400) {
        console.warn(
          "[migrate] failed to mark Clerk email verified (non-fatal):",
          verifyResp.status,
          verifyResp.body,
        );
      }
    }

    // Link the local row to the new Clerk user.
    await db
      .update(usersTable)
      .set({ clerkUserId: clerkUser.id })
      .where(eq(usersTable.id, user.id));

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

export default router;
export { CLERK_MANAGED_SENTINEL };
