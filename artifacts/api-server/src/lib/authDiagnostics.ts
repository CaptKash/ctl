const LABELS = new Set([
  "entry", "null-signIn", "clerk-error", "unknown-error", "complete",
  "non-complete", "needs-2fa", "2fa-prepared", "2fa-prepare-failed",
  "2fa-attempt", "2fa-verify-failed", "2fa-resend-start",
  "2fa-resend-accepted", "2fa-resend-failed", "production-environment",
]);
const STATUSES = new Set([
  "needs_identifier", "needs_first_factor", "needs_second_factor",
  "needs_new_password", "complete", "abandoned",
]);

/** Anonymous client diagnostics must never log arbitrary caller payloads. */
export function sanitizeAuthDiagnostic(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  if (typeof data.label !== "string" || !LABELS.has(data.label)) return null;
  const result: Record<string, unknown> = { label: data.label };
  for (const key of ["signInLoaded", "signInIsNull", "setActiveIsNull"]) {
    if (typeof data[key] === "boolean") result[key] = data[key];
  }
  for (const [key, min, max] of [
    ["attempt", 1, 10], ["httpStatus", 100, 599],
    ["retryAfterSeconds", 1, 3600], ["ts", 1000000000000, 9999999999999],
  ] as const) {
    const value = data[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) {
      result[key] = value;
    }
  }
  if (typeof data.code === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(data.code)) result.code = data.code;
  if (typeof data.status === "string" && STATUSES.has(data.status)) result.status = data.status;
  if (typeof data.environmentStatus === "string" &&
    ["checking", "production", "blocked"].includes(data.environmentStatus)) {
    result.environmentStatus = data.environmentStatus;
  }
  return result;
}
