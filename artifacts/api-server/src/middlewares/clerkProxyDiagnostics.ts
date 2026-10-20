import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { logger } from "../lib/logger";

const MAX_BODY_BYTES = 64 * 1024;
const SIGN_IN_STATUSES = new Set([
  "needs_identifier", "needs_first_factor", "needs_second_factor",
  "needs_new_password", "complete", "abandoned",
]);
const VERIFICATION_STATUSES = new Set([
  "unverified", "verified", "failed", "expired", "transferable",
]);

// Never log query strings or Clerk attempt IDs, even when a URL is malformed.
export function getClerkAuthDiagnosticPath(url: string): string | null {
  const path = url.split("?")[0].replace(/^\/api\/__clerk/, "");
  const match = path.match(
    /^\/v1\/client\/(sign_ins?)(?:\/[^/]+)?(?:\/(prepare_first_factor|attempt_first_factor|prepare_second_factor|attempt_second_factor|reset_password))?\/?$/,
  );
  if (!match) return null;
  const hasId = path.replace(/\/$/, "").split("/").length > 4;
  return `/v1/client/${match[1]}${hasId ? "/:attempt" : ""}${match[2] ? `/${match[2]}` : ""}`;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function statusFrom(value: unknown, allowed: Set<string>): string | null {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

export function summarizeClerkAuthResponse(body: Buffer, encoding?: string) {
  try {
    if (body.length > MAX_BODY_BYTES) return { bodyRead: "too_large" };
    const options = { maxOutputLength: MAX_BODY_BYTES };
    let decoded = body;
    switch (encoding?.toLowerCase()) {
      case undefined:
      case "":
      case "identity": break;
      case "gzip": decoded = gunzipSync(body, options); break;
      case "br": decoded = brotliDecompressSync(body, options); break;
      case "deflate": decoded = inflateSync(body, options); break;
      default: return { bodyRead: "unsupported_encoding" };
    }
    const parsed = record(JSON.parse(decoded.toString("utf8")));
    const response = record(parsed.response);
    const signIn = response.object === "sign_in" || "status" in response
      ? response
      : record(response.sign_in ?? record(response.client).sign_in ?? record(parsed.client).sign_in);
    const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
    // Error messages/meta may echo identifiers and credentials. Codes only.
    const errorCodes = errors.slice(0, 10)
      .map(error => record(error).code)
      .filter((code): code is string =>
        typeof code === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(code));
    const first = record(signIn.first_factor_verification);
    const second = record(signIn.second_factor_verification);
    return {
      bodyRead: "json",
      errorCodes,
      clerkStatus: statusFrom(signIn.status, SIGN_IN_STATUSES),
      firstFactorStatus: statusFrom(first.status, VERIFICATION_STATUSES),
      secondFactorStatus: statusFrom(second.status, VERIFICATION_STATUSES),
      secondFactorIsEmailCode: second.strategy === "email_code",
    };
  } catch {
    // Do not include parsing/decompression errors: they can echo body contents.
    return { bodyRead: "unreadable" };
  }
}

type DiagnosticEvent = Record<string, unknown>;
type Sink = (event: DiagnosticEvent) => void;

interface AttemptTrace {
  requestId: string;
  method: string;
  path: string;
  startedAt: number;
  completed: boolean;
}

/**
 * Observes, but never rewrites, proxy requests/responses. Retains at most 64KiB
 * per observed response and bounds decompression. No request body is inspected.
 * Each request has an opaque ID, not an account/session/attempt identifier.
 */
export function createClerkAuthDiagnostics(
  sink: Sink = event => logger.info(event, "clerk-auth-trace"),
) {
  const traces = new WeakMap<IncomingMessage, AttemptTrace>();
  const emit = (trace: AttemptTrace, event: DiagnosticEvent) => {
    sink({
      event: "clerk-auth-trace",
      requestId: trace.requestId,
      method: trace.method,
      path: trace.path,
      elapsedMs: Date.now() - trace.startedAt,
      ...event,
    });
  };
  const complete = (trace: AttemptTrace, event: DiagnosticEvent) => {
    if (trace.completed) return;
    trace.completed = true;
    emit(trace, event);
  };

  return {
    start(req: IncomingMessage, res: ServerResponse) {
      const path = getClerkAuthDiagnosticPath(req.url ?? "");
      if (!path) return;
      const trace: AttemptTrace = {
        requestId: randomUUID(),
        method: ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"].includes(req.method ?? "")
          ? req.method! : "OTHER",
        path,
        startedAt: Date.now(),
        completed: false,
      };
      traces.set(req, trace);
      emit(trace, { stage: "request" });
      res.once("close", () => {
        complete(trace, {
          stage: "transport",
          outcome: res.writableFinished ? "response_finished_without_upstream_body" : "connection_closed",
          httpStatus: res.headersSent ? res.statusCode : null,
        });
      });
    },
    observe(req: IncomingMessage, upstream: IncomingMessage) {
      const trace = traces.get(req);
      if (!trace) return;
      const httpStatus = upstream.statusCode ?? 502;
      const retryAfter = upstream.headers["retry-after"];
      const clerkTrace = upstream.headers["clerk-trace-id"] ?? upstream.headers["x-clerk-trace-id"];
      const metadata = {
        httpStatus,
        retryAfterSeconds: typeof retryAfter === "string" && /^\d{1,6}$/.test(retryAfter)
          ? Number(retryAfter) : null,
        clerkTraceId: typeof clerkTrace === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(clerkTrace)
          ? clerkTrace : null,
      };
      emit(trace, { stage: "upstream_response", ...metadata });
      let bytes = 0;
      const chunks: Buffer[] = [];
      upstream.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes <= MAX_BODY_BYTES) chunks.push(chunk);
        else chunks.length = 0;
      });
      upstream.once("end", () => {
        complete(trace, {
          stage: "response",
          ...metadata,
          ...(bytes > MAX_BODY_BYTES
            ? { bodyRead: "too_large" }
            : summarizeClerkAuthResponse(Buffer.concat(chunks), upstream.headers["content-encoding"])),
        });
        chunks.length = 0;
      });
      upstream.once("aborted", () => {
        chunks.length = 0;
        complete(trace, { stage: "transport", outcome: "upstream_aborted", ...metadata });
      });
      upstream.once("error", () => {
        chunks.length = 0;
        complete(trace, { stage: "transport", outcome: "upstream_error", ...metadata });
      });
    },
  };
}
