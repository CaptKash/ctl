const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createResendControl, summarizeSignInError } = require("../lib/signInSafety.ts");

test("blocks overlapping taps and allows retry after the cooldown deadline", () => {
  const control = createResendControl();
  assert.equal(control.acquire(1000), true);
  assert.equal(control.acquire(1000), false);
  assert.equal(control.acquire(100000), false); // pending request, not just a timer
  control.finish(100000, 30);
  assert.equal(control.remaining(101001), 29);
  assert.equal(control.acquire(129999), false);
  assert.equal(control.acquire(130000), true);
});

test("initial preparation starts a cooldown; elapsed background time is respected", () => {
  const control = createResendControl();
  control.cooldown(1000, 30);
  assert.equal(control.acquire(1000), false);
  assert.equal(control.remaining(120000), 0);
  assert.equal(control.acquire(120000), true);
  control.finish(120000, 90);
  assert.equal(control.remaining(150000), 60);
  control.reset();
  assert.equal(control.acquire(150000), true);
});

test("error summaries omit identifiers, messages, codes entered by users, and credentials", () => {
  const summary = summarizeSignInError({
    status: 429, retryAfter: 59.2,
    errors: [{
      code: "too_many_requests", message: "private@example.test password-secret",
      longMessage: "123456", meta: { token: "token-secret" },
    }],
    cookie: "cookie-secret",
  });
  assert.deepEqual(summary, { code: "too_many_requests", httpStatus: 429, retryAfterSeconds: 60 });
  assert.equal(JSON.stringify(summary).includes("secret"), false);
  assert.equal(JSON.stringify(summary).includes("private"), false);
  assert.equal(JSON.stringify(summary).includes("123456"), false);
});

test("malformed error metadata is bounded or discarded", () => {
  assert.deepEqual(summarizeSignInError(null), { code: "unknown_error", httpStatus: null, retryAfterSeconds: null });
  assert.deepEqual(summarizeSignInError({
    status: 10000, retryAfter: Infinity, errors: [{ code: "private@example.test" }],
  }), { code: "unknown_error", httpStatus: null, retryAfterSeconds: null });
  assert.equal(summarizeSignInError({ retryAfter: 999999 }).retryAfterSeconds, 3600);
});
