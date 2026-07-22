import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import privacyRouter from "./routes/privacy";

const app: Express = express();

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
  app.use(clerkMiddleware());
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
app.use("/api", router);

export default app;
