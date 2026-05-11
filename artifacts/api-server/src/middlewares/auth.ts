import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

// Fail fast at boot if JWT_SECRET is missing. Previously fell back to a
// hardcoded literal — that allowed forged tokens in any misconfigured env.
// The actual rotation of this secret is intentionally deferred until Phase 3
// of the Clerk migration ships (rotating now would log out all 71 prod users
// on the old pre-Clerk login UI). After Phase 3, a follow-up will rotate
// JWT_SECRET to a fresh strong value once legacy JWTs are no longer accepted.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET env var is required. Refusing to start with a default secret.",
  );
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface AuthPayload {
  id: number;
  email: string;
  name: string;
  isAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Resolve the request's authenticated user via either:
 *   1. Legacy JWT (existing 71 prod users on bcrypt + custom JWT) — cheap
 *      in-memory verify, tried first because every existing user is here.
 *   2. Clerk session — populated by `clerkMiddleware()` mounted in app.ts.
 *      We accept it iff a local users row is linked via `clerk_user_id`
 *      (link is established by Phase 2's `/auth/clerk/sync-user`).
 *
 * Both paths produce the same `AuthPayload` shape so downstream route
 * handlers are credential-agnostic. Returns null if neither succeeds.
 */
async function authenticate(req: Request): Promise<AuthPayload | null> {
  // Path 1 — legacy JWT
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      // jwt.verify's return type is Jwt | JwtPayload | string. Cast through
      // unknown — we re-validate the shape immediately below before trusting.
      const payload = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
      if (typeof payload?.id === "number") return payload;
    } catch {
      // Not a legacy JWT — fall through to Clerk path.
    }
  }

  // Path 2 — Clerk session.
  // Env-gate identically to app.ts: if Clerk keys aren't set, clerkMiddleware
  // wasn't mounted, so getAuth() would throw. Detecting this upfront (instead
  // of via try/catch) means we no longer swallow *any* getAuth runtime error.
  // Any unexpected throw below — bad token format, Clerk SDK bug, network
  // failure inside the SDK — now propagates to requireAuth's outer try/catch
  // and surfaces as 500, exactly as architect review #2 required.
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    return null;
  }
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return null;

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      isAdmin: usersTable.isAdmin,
    })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  // If no local user is linked yet, the mobile app (Phase 3) must call
  // `/auth/clerk/sync-user` once before any other protected endpoint.
  // Returning null here causes a 401, which is the correct signal.
  return user ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    req.user = user;
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Authentication check failed." });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await authenticate(req);
    if (user) req.user = user;
  } catch {
    // optional — never block the request
  }
  next();
}
