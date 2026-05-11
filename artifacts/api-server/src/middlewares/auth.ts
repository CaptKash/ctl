import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const JWT_SECRET = process.env.JWT_SECRET ?? "ctl-logbook-secret-2025";

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
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      if (typeof payload?.id === "number") return payload;
    } catch {
      // Not a legacy JWT — fall through to Clerk path.
    }
  }

  // Path 2 — Clerk session.
  let auth: ReturnType<typeof getAuth> | undefined;
  try {
    auth = getAuth(req);
  } catch {
    // `clerkMiddleware()` was never mounted in this process (e.g. CLERK_*
    // env missing). Silently treat as no Clerk session — this is the only
    // error we want to swallow. Any *other* failure below (DB outage etc.)
    // must surface as a 500 via requireAuth's outer try/catch, NOT degrade
    // to a misleading 401.
    return null;
  }

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
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    res.status(500).json({ error: "Authentication check failed." });
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
