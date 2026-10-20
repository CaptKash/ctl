function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

/** Clerk messages/meta can contain identifiers. Keep only bounded metadata. */
export function summarizeSignInError(error: unknown) {
  const value = record(error);
  const first = Array.isArray(value.errors) ? record(value.errors[0]) : {};
  const code = typeof first.code === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(first.code)
    ? first.code : "unknown_error";
  const httpStatus = Number.isInteger(value.status) &&
    Number(value.status) >= 100 && Number(value.status) <= 599 ? Number(value.status) : null;
  const retryAfterSeconds = typeof value.retryAfter === "number" &&
    Number.isFinite(value.retryAfter) && value.retryAfter > 0
    ? Math.min(3600, Math.ceil(value.retryAfter)) : null;
  return { code, httpStatus, retryAfterSeconds };
}

/** Synchronous lock stops double taps before React has rerendered. */
export function createResendControl() {
  let busy = false;
  let until = 0;
  return {
    acquire(now: number) {
      if (busy || now < until) return false;
      busy = true;
      return true;
    },
    remaining(now: number) { return Math.max(0, Math.ceil((until - now) / 1000)); },
    isBusy() { return busy; },
    cooldown(now: number, seconds: number) { until = now + seconds * 1000; },
    finish(now: number, seconds: number) {
      until = now + seconds * 1000;
      busy = false;
    },
    reset() { busy = false; until = 0; },
  };
}
