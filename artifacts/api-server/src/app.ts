import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import privacyRouter from "./routes/privacy";

const app: Express = express();

app.use(cors());
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
