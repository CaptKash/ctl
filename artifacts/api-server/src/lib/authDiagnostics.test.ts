import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeAuthDiagnostic } from "./authDiagnostics";

test("anonymous auth events retain only bounded safe fields", () => {
  const output = sanitizeAuthDiagnostic({
    label: "2fa-resend-failed", code: "too_many_requests", httpStatus: 429,
    retryAfterSeconds: 60, ts: 1791178444222,
    email: "private@example.test", password: "secret", message: "private@example.test",
    token: "token-secret", verificationCode: "123456", errors: [{ message: "private" }],
  });
  assert.deepEqual(output, {
    label: "2fa-resend-failed", code: "too_many_requests", httpStatus: 429,
    retryAfterSeconds: 60, ts: 1791178444222,
  });
});

test("invalid labels and unbounded fields are rejected or omitted", () => {
  assert.equal(sanitizeAuthDiagnostic(null), null);
  assert.equal(sanitizeAuthDiagnostic({ label: "private@example.test" }), null);
  assert.deepEqual(sanitizeAuthDiagnostic({
    label: "entry", attempt: 100, httpStatus: 9999, retryAfterSeconds: Infinity,
    status: "private@example.test", code: "private@example.test", ts: "token",
    signInLoaded: true, environmentStatus: "development",
  }), { label: "entry", signInLoaded: true });
});

test("production-check diagnostics contain only an allowlisted outcome", () => {
  assert.deepEqual(sanitizeAuthDiagnostic({
    label: "production-environment", environmentStatus: "blocked",
  }), { label: "production-environment", environmentStatus: "blocked" });
});
