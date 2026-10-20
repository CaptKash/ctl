import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PassThrough } from "node:stream";
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";
import test from "node:test";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import {
  createClerkAuthDiagnostics,
  getClerkAuthDiagnosticPath,
  summarizeClerkAuthResponse,
} from "./clerkProxyDiagnostics";

test("diagnostic paths redact attempt IDs and discard all query values", () => {
  assert.equal(getClerkAuthDiagnosticPath("/api/__clerk/v1/client/sign_ins?password=private"),
    "/v1/client/sign_ins");
  assert.equal(getClerkAuthDiagnosticPath("/v1/client/sign_ins/sia_private/prepare_second_factor?code=123456"),
    "/v1/client/sign_ins/:attempt/prepare_second_factor");
  assert.equal(getClerkAuthDiagnosticPath("/v1/client/sign_in/sia_private/attempt_second_factor"),
    "/v1/client/sign_in/:attempt/attempt_second_factor");
  assert.equal(getClerkAuthDiagnosticPath("/v1/client/sign_ins/sia_private"),
    "/v1/client/sign_ins/:attempt");
  assert.equal(getClerkAuthDiagnosticPath("/v1/environment"), null);
  assert.equal(getClerkAuthDiagnosticPath("/v1/client/sessions/sess_private/tokens"), null);
  assert.equal(getClerkAuthDiagnosticPath("/v1/client/sign_ins/id/unknown/private"), null);
});

const responseBody = Buffer.from(JSON.stringify({
  response: {
    object: "sign_in", status: "needs_second_factor", identifier: "private@example.com",
    created_session_id: "sess_private",
    first_factor_verification: { status: "verified", strategy: "password" },
    second_factor_verification: {
      status: "unverified", strategy: "email_code", external_verification_redirect_url: "private",
    },
  },
  errors: [{
    code: "too_many_requests", message: "private@example.com code 123456",
    long_message: "password private", meta: { token: "secret" },
  }],
}));

test("response summary keeps only codes and allowlisted verification states", () => {
  const summary = summarizeClerkAuthResponse(responseBody);
  assert.deepEqual(summary, {
    bodyRead: "json", errorCodes: ["too_many_requests"],
    clerkStatus: "needs_second_factor", firstFactorStatus: "verified",
    secondFactorStatus: "unverified", secondFactorIsEmailCode: true,
  });
  const logged = JSON.stringify(summary);
  for (const secret of ["private@example.com", "123456", "sess_private", "secret", "password"]) {
    assert.ok(!logged.includes(secret));
  }
});

test("compressed summaries work without modifying the response bytes", () => {
  for (const [encoding, encode] of [
    ["gzip", gzipSync], ["br", brotliCompressSync], ["deflate", deflateSync],
  ] as const) {
    const compressed = encode(responseBody);
    const copy = Buffer.from(compressed);
    assert.deepEqual(summarizeClerkAuthResponse(compressed, encoding),
      summarizeClerkAuthResponse(responseBody));
    assert.deepEqual(compressed, copy);
  }
});

test("malformed, oversized, and decompression-bomb bodies fail safely", () => {
  assert.deepEqual(summarizeClerkAuthResponse(Buffer.from("private@example.com")), { bodyRead: "unreadable" });
  assert.deepEqual(summarizeClerkAuthResponse(Buffer.alloc(65537)), { bodyRead: "too_large" });
  assert.deepEqual(summarizeClerkAuthResponse(gzipSync(Buffer.alloc(200000)), "gzip"), { bodyRead: "unreadable" });
  assert.deepEqual(summarizeClerkAuthResponse(responseBody, "unknown"), { bodyRead: "unsupported_encoding" });
  const summary = summarizeClerkAuthResponse(Buffer.from(JSON.stringify({
    response: { status: "private@example.com", second_factor_verification: { status: "123456" } },
    errors: [{ code: "private@example.com" }, { code: "rate_limit_exceeded" }],
  })));
  assert.deepEqual(summary, {
    bodyRead: "json", errorCodes: ["rate_limit_exceeded"], clerkStatus: null,
    firstFactorStatus: null, secondFactorStatus: null, secondFactorIsEmailCode: false,
  });
});

test("upstream aborts produce one terminal event without logging error messages", () => {
  const events: Record<string, unknown>[] = [];
  const diagnostics = createClerkAuthDiagnostics(event => events.push(event));
  const req = { url: "/v1/client/sign_ins/sia_private/prepare_second_factor", method: "POST" } as IncomingMessage;
  const res = new PassThrough() as unknown as ServerResponse;
  diagnostics.start(req, res);
  const upstream = Object.assign(new PassThrough(), {
    headers: {}, statusCode: 502,
  }) as unknown as IncomingMessage;
  diagnostics.observe(req, upstream);
  upstream.emit("aborted");
  upstream.emit("error", new Error("password=secret"));
  res.emit("close");
  assert.equal(events.filter(event => event.stage === "transport").length, 1);
  assert.equal(events.at(-1)?.outcome, "upstream_aborted");
  assert.ok(!JSON.stringify(events).includes("secret"));
});

test("a request that never receives upstream headers still gets a safe terminal event", () => {
  const events: Record<string, unknown>[] = [];
  const diagnostics = createClerkAuthDiagnostics(event => events.push(event));
  const req = { url: "/v1/client/sign_ins/sia_private/prepare_second_factor", method: "POST" } as IncomingMessage;
  const res = new PassThrough() as unknown as ServerResponse;
  diagnostics.start(req, res);
  res.emit("close");
  assert.equal(events.at(-1)?.outcome, "connection_closed");
  assert.equal(events.at(-1)?.httpStatus, null);
});

// Local mock upstream only: no Clerk accounts, codes, secrets or sessions used.
for (const streamed of [false, true]) {
  for (const compressed of [false, true]) {
    test(`observing ${streamed ? "streamed" : "buffered"} ${compressed ? "gzip" : "plain"} proxy responses preserves bytes and headers`, async () => {
      const events: Record<string, unknown>[] = [];
      const diagnostics = createClerkAuthDiagnostics(event => events.push(event));
      const body = compressed ? gzipSync(responseBody) : responseBody;
      let forwardedBody = "";
      const upstreamServer = createServer((req, res) => {
        req.on("data", chunk => { forwardedBody += chunk.toString(); });
        req.on("end", () => {
          res.writeHead(429, {
            "content-type": "application/json",
            ...(streamed ? { "content-length": String(body.length) } : {}),
            ...(compressed ? { "content-encoding": "gzip" } : {}),
            "retry-after": "60", "clerk-trace-id": "trace_mock12345",
            "set-cookie": "clerk=private_cookie; HttpOnly",
          });
          res.end(body);
        });
      });
      const app = express();
      app.use("/api/__clerk", (req, res, next) => {
        diagnostics.start(req, res);
        next();
      });
      upstreamServer.listen(0, "127.0.0.1");
      await once(upstreamServer, "listening");
      const upstreamPort = (upstreamServer.address() as { port: number }).port;
      app.use("/api/__clerk", createProxyMiddleware({
        target: `http://127.0.0.1:${upstreamPort}`,
        selfHandleResponse: true,
        on: {
          proxyRes(upstream, req, res) {
            diagnostics.observe(req, upstream);
            const headers = { ...upstream.headers };
            delete headers["transfer-encoding"];
            if (headers["content-length"] !== undefined) {
              res.writeHead(upstream.statusCode!, headers);
              upstream.pipe(res);
            } else {
              const chunks: Buffer[] = [];
              upstream.on("data", chunk => chunks.push(chunk));
              upstream.on("end", () => {
                const received = Buffer.concat(chunks);
                res.writeHead(upstream.statusCode!, { ...headers, "content-length": String(received.length) });
                res.end(received);
              });
            }
          },
        },
      }));
      const proxyServer = app.listen(0, "127.0.0.1");
      await once(proxyServer, "listening");
      const proxyPort = (proxyServer.address() as { port: number }).port;
      try {
        // Node HTTP intentionally avoids fetch's automatic gzip decoding.
        const { request } = await import("node:http");
        const result = await new Promise<{ body: Buffer; headers: IncomingMessage["headers"]; status?: number }>((resolve, reject) => {
          const req = request(`http://127.0.0.1:${proxyPort}/api/__clerk/v1/client/sign_ins/sia_private/prepare_second_factor?token=private_query`, {
            method: "POST", headers: { authorization: "Bearer private_token", "content-type": "application/x-www-form-urlencoded" },
          }, res => {
            const chunks: Buffer[] = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => resolve({ body: Buffer.concat(chunks), headers: res.headers, status: res.statusCode }));
          });
          req.on("error", reject);
          req.end("password=private_password&code=123456");
        });
        assert.deepEqual(result.body, body);
        assert.equal(result.status, 429);
        assert.equal(result.headers["content-encoding"], compressed ? "gzip" : undefined);
        assert.deepEqual(result.headers["set-cookie"], ["clerk=private_cookie; HttpOnly"]);
        assert.equal(forwardedBody, "password=private_password&code=123456");
        assert.equal(events.length, 3);
        assert.equal(new Set(events.map(event => event.requestId)).size, 1);
        const complete = events.at(-1)!;
        assert.equal(complete.stage, "response");
        assert.equal(complete.httpStatus, 429);
        assert.equal(complete.retryAfterSeconds, 60);
        assert.equal(complete.clerkTraceId, "trace_mock12345");
        assert.deepEqual(complete.errorCodes, ["too_many_requests"]);
        assert.equal(complete.secondFactorStatus, "unverified");
        for (const sensitive of ["private", "123456", "authorization", "cookie", "password", "token="]) {
          assert.ok(!JSON.stringify(events).includes(sensitive));
        }
      } finally {
        await Promise.all([
          new Promise<void>(resolve => proxyServer.close(() => resolve())),
          new Promise<void>(resolve => upstreamServer.close(() => resolve())),
        ]);
      }
    });
  }
}
