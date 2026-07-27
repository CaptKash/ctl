/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler, Request } from "express";
import type { IncomingHttpHeaders } from "http";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

// Paths that are safe to cache in-memory (rarely change, same for all clients).
const CACHEABLE_PATHS = new Set(["/v1/environment"]);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  body: Buffer;
  headers: Record<string, string | string[]>;
  status: number;
  ts: number;
}

/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 *
 * x-forwarded-host can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream appended rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the multi-value case, the leftmost value is the original client-
 * facing host. Take that one in all forms. Exported so that app.ts
 * (clerkMiddleware callback) and this proxy middleware agree on which
 * hostname is canonical — otherwise multi-domain/custom-domain flows
 * break.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(",")[0]?.trim();
  return firstHop || req.headers.host?.trim() || undefined;
}

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  // In-memory response cache for stable, shared Clerk endpoints.
  const responseCache = new Map<string, CacheEntry>();

  const proxy = createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    // Take over the response so it can be re-sent with a Content-Length (see
    // proxyRes); the deployment edge rejects chunked proxied responses.
    selfHandleResponse: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = getClerkProxyHost(req) || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
      // Clerk's dynamic Frontend API responses (/v1/environment, /v1/client,
      // JWKS, ...) arrive without a Content-Length, so relaying them would use
      // Transfer-Encoding: chunked — which the deployment edge (Cloud Run)
      // rejects, turning the app's 200 into a 500. Buffer only those so they can
      // be re-sent with a Content-Length; the body is forwarded untouched so
      // Content-Encoding is preserved. Length-known responses (e.g. /npm/*
      // assets) and body-less responses stream through without buffering.
      proxyRes: (proxyRes, req, res) => {
        const expressReq = req as Request;
        const clerkPath: string = expressReq.path ?? "";
        const status = proxyRes.statusCode ?? 502;
        const shouldCache =
          req.method === "GET" &&
          status === 200 &&
          CACHEABLE_PATHS.has(clerkPath);

        const headers = { ...proxyRes.headers };
        // Transfer-Encoding/Connection are hop-by-hop (RFC 7230 §6.1).
        delete headers["transfer-encoding"];
        delete headers["connection"];
        delete headers["keep-alive"];

        // Content-Length is forbidden on 1xx/204; HEAD/304 may keep theirs.
        if (status < 200 || status === 204) {
          delete headers["content-length"];
        }

        const bodyless =
          req.method === "HEAD" ||
          status < 200 ||
          status === 204 ||
          status === 304;
        if (headers["content-length"] !== undefined || bodyless) {
          res.writeHead(status, headers);
          // Headers are already sent, so abort the response if the upstream
          // stream errors mid-pipe (e.g. ECONNRESET) rather than leaving an
          // unhandled 'error' or a hung client.
          proxyRes.on("error", () => res.destroy());
          proxyRes.pipe(res);
          return;
        }

        const chunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on("end", () => {
          const body = Buffer.concat(chunks);
          headers["content-length"] = String(body.length);

          if (shouldCache) {
            responseCache.set(clerkPath, {
              body,
              headers: headers as Record<string, string | string[]>,
              status,
              ts: Date.now(),
            });
          }

          // Temporary SSO diagnostics: log sign_in requests/responses so
          // production errors are visible in deployment logs.
          if (
            clerkPath.startsWith("/v1/client/sign_in") ||
            clerkPath.startsWith("/v1/client/sessions")
          ) {
            try {
              const bodyStr = body.toString("utf8");
              const parsed = JSON.parse(bodyStr);
              const errors = parsed?.errors;
              const response = parsed?.response;
              console.log(
                `[clerk-proxy] ${req.method} ${clerkPath} → ${status}`,
                JSON.stringify({
                  errors: errors ?? null,
                  status: response?.status ?? null,
                  firstFactorStatus:
                    response?.first_factor_verification?.status ?? null,
                  externalUrl: response?.first_factor_verification
                    ?.external_verification_redirect_url
                    ? "[set]"
                    : "[missing]",
                })
              );
            } catch {
              // JSON parse failed — log raw status only
              console.log(
                `[clerk-proxy] ${req.method} ${clerkPath} → ${status} (non-JSON body)`
              );
            }
          }

          res.writeHead(status, headers);
          res.end(body);
        });
        proxyRes.on("error", () => {
          if (!res.headersSent) {
            // Set a length so the empty 502 isn't sent chunked (which the
            // deployment edge would reject just like the original response).
            res.writeHead(502, { "content-length": "0" });
          }
          res.end();
        });
      },
    },
  }) as RequestHandler;

  // Outer middleware: serve cache hits without touching Clerk FAPI at all,
  // otherwise fall through to the proxy (which populates the cache on success).
  return (req, res, next) => {
    if (req.method === "GET" && CACHEABLE_PATHS.has(req.path)) {
      const entry = responseCache.get(req.path);
      if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
        const headers = {
          ...entry.headers,
          "x-clerk-cache": "HIT",
          "content-length": String(entry.body.length),
        };
        res.writeHead(entry.status, headers);
        res.end(entry.body);
        return;
      }
    }
    proxy(req, res, next);
  };
}
