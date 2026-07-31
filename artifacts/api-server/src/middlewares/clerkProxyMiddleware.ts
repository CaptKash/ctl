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

        // Strip _is_native=1 before forwarding to Clerk FAPI.
        // The clerk-expo SDK appends this flag to every request, which routes
        // calls through Clerk's "Native API" path — a feature that requires
        // "Native Applications" to be explicitly enabled in the Clerk dashboard.
        // When it is not enabled, Clerk returns native_api_disabled silently and
        // the SDK's SignIn/SignUp resources stay blank (all fields null).
        // Stripping the flag causes Clerk to treat requests as web-path calls,
        // which return identical OAuth redirect URLs and session data and are
        // fully compatible with every subsequent SDK step (JWT storage,
        // client.sessions population, setActive).
        if (proxyReq.path.includes("_is_native")) {
          const [pathname, search] = proxyReq.path.split("?");
          const params = new URLSearchParams(search ?? "");
          params.delete("_is_native");
          const newSearch = params.toString();
          proxyReq.path = newSearch ? `${pathname}?${newSearch}` : pathname;
        }

        // Log the authorization header the SDK sends for SSO requests so we
        // can see whether it's empty, a valid client JWT, or a stale token.
        if (proxyReq.path.includes("/client/sign_in")) {
          const authHeader = proxyReq.getHeader("authorization") as string | undefined;
          const preview = authHeader
            ? `${String(authHeader).slice(0, 50)}… (len ${String(authHeader).length})`
            : "(empty)";
          console.log(`[clerk-proxy auth] ${req.method} ${proxyReq.path} | authorization: ${preview}`);
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
        // Prevent iOS NSURLCache from serving a stale cached error/empty response
        // from earlier failed SSO attempts. Clerk FAPI responses are session-specific
        // and must never be served from cache.
        headers["cache-control"] = "no-store";
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
          // Log streamed (content-length-known) responses too — previously
          // these were silently piped and never appeared in diagnostics.
          console.log(
            `[clerk-proxy PIPE] ${req.method} ${clerkPath} → HTTP ${status}`,
            `(content-length: ${headers["content-length"] ?? "n/a"}, encoding: ${headers["content-encoding"] ?? "none"})`
          );
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

          // Temporary SSO diagnostics — log ALL Clerk proxy requests so we can
          // see whether the app is reaching the proxy and what Clerk returns.
          try {
            const bodyStr = body.toString("utf8");
            let logPayload: Record<string, unknown> = {};
            if (clerkPath.startsWith("/v1/client/sign_in") ||
                clerkPath.startsWith("/v1/client/sessions")) {
              const parsed = JSON.parse(bodyStr);
              const errors = parsed?.errors;
              const response = parsed?.response;
              logPayload = {
                errors: errors ?? null,
                clerkStatus: response?.status ?? null,
                firstFactorStatus:
                  response?.first_factor_verification?.status ?? null,
                externalUrl: response?.first_factor_verification
                  ?.external_verification_redirect_url
                  ? "[set]"
                  : "[missing]",
              };
            }
            console.log(
              `[clerk-proxy] ${req.method} ${clerkPath} → HTTP ${status}`,
              Object.keys(logPayload).length
                ? JSON.stringify(logPayload)
                : "(cached/non-JSON)"
            );
          } catch {
            console.log(
              `[clerk-proxy] ${req.method} ${clerkPath} → HTTP ${status}`
            );
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
        console.log(`[clerk-proxy] ${req.method} ${req.path} → HTTP ${entry.status} (cache HIT)`);
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
