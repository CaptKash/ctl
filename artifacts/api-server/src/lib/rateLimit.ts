import type { Request } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Purge expired entries every minute to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000).unref();

/**
 * In-memory, per-key rate limiter.
 * Returns true if the request is allowed, false if the limit is exceeded.
 *
 * @param key         Unique identifier (e.g. "login:1.2.3.4")
 * @param maxRequests Maximum allowed requests in the window
 * @param windowMs    Window duration in milliseconds
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count += 1;
  return entry.count <= maxRequests;
}

/**
 * Extract the best-available client IP from the request.
 * Prefers the leftmost address in X-Forwarded-For (set by the Replit proxy),
 * falls back to the direct socket address.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}
