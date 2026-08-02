import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import privacyRouter from "./routes/privacy";
import { checkRateLimit, getClientIp } from "./lib/rateLimit";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

// Temporary catch-all request logger — helps diagnose which paths the iOS
// app is actually hitting (Clerk SDK may be calling /v1/* directly instead
// of /api/__clerk/v1/*). Remove once SSO is confirmed working.
if (process.env.NODE_ENV === "production") {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[req] ${req.method} ${req.path}`);
    next();
  });
}

// Clerk Frontend API proxy — must come before body parsers so raw bytes are
// streamed through untouched. Active in production only; no-ops in dev.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Restrict CORS to explicitly configured origins.
// In non-production environments every origin is reflected so local/dev
// tooling keeps working without configuration. In production, set
// ALLOWED_ORIGINS to a comma-separated list of trusted origins
// (e.g. "https://myapp.replit.app"). Native mobile requests carry no
// Origin header and are always allowed regardless of this setting.
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = native app or server-to-server — always allow.
      if (!origin) return callback(null, true);
      // In non-production, allow everything (dev tooling, Expo web, etc.).
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      // In production, allow only the configured allowlist.
      if (configuredOrigins && configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Phase 1 of Clerk migration: mount Clerk middleware so the dual-auth
// `requireAuth` (in middlewares/auth.ts) can read Clerk session state via
// getAuth(req). Reads CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY from env.
// Safe even when no Clerk session is present — getAuth() simply returns
// userId: null and the dual-auth path falls back to legacy JWT.
if (process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  // jwtKey enables local JWT verification — no outbound JWKS network call
  // on every request. Without it, @clerk/express fetches the JWKS from
  // Clerk's servers each time, and any network hiccup silently returns
  // userId: null. Set via CLERK_JWT_KEY secret (Clerk dashboard →
  // Configure → API Keys → JWT public key).
  app.use(clerkMiddleware({
    jwtKey: process.env.CLERK_JWT_KEY,
  }));
} else {
  // Loud warning: if Clerk keys are absent in any environment that's
  // expected to support new sign-ins (i.e. anything beyond Phase 0/1),
  // every Clerk-bearing request will silently 401. Dev without Clerk
  // is OK during Phase 1 since no Clerk tokens exist yet.
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] CLERK_SECRET_KEY/CLERK_PUBLISHABLE_KEY not set — Clerk auth is disabled. " +
      "Only legacy JWTs will be accepted.",
  );
}
const staticDir = typeof import.meta.dirname !== "undefined"
  ? path.join(import.meta.dirname, "..", "public")
  : path.join(process.cwd(), "artifacts/api-server/public");
app.use("/static", express.static(staticDir));

app.use("/", privacyRouter);

// Global rate limit: 300 requests per minute per IP across all /api routes.
// Individual sensitive routes (auth, feedback) enforce their own tighter limits
// in addition to this baseline guard.
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`global:${ip}`, 300, 60_000)) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }
  next();
});

app.use("/api", router);

export default app;
