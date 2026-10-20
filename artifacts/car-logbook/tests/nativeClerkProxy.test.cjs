const { test } = require("node:test");
const assert = require("node:assert/strict");
const { installNativeClerkProxy } = require("../lib/nativeClerkProxy.ts");

const proxy = "https://ctl.example.test/api/__clerk";
function fixture(verify = true) {
  const callbacks = [];
  const after = [];
  const clerk = {
    frontendApi: "example.clerk.accounts.dev",
    __unstable__onBeforeRequest(callback) { callbacks.push(callback); },
    __unstable__onAfterResponse(callback) { after.push(callback); },
  };
  installNativeClerkProxy(clerk, proxy);
  const environment = (value, status = 200) => after[0](
    { url: new URL(`${proxy}/v1/environment`) },
    { status, payload: { display_config: { instance_environment_type: value } } },
  );
  if (verify) environment("production");
  return { clerk, callbacks, route: callbacks[0], environment };
}

for (const path of [
  "/v1/environment", "/v1/client", "/v1/client/sign_ins",
  "/v1/client/sign_ins/example/prepare_second_factor",
  "/v1/client/sign_ins/example/attempt_second_factor",
  "/v1/client/sign_ins/example/prepare_first_factor",
  "/v1/client/sessions/example/tokens",
]) {
  test(`routes ${path} through the production proxy`, () => {
    const { route } = fixture();
    const req = { url: new URL(`https://example.clerk.accounts.dev${path}?_is_native=1&example=a%2Bb`) };
    route(req);
    assert.equal(req.url.href, `${proxy}${path}?_is_native=1&example=a%2Bb`);
  });
}

test("preserves request data, headers, and the existing URL object", () => {
  const { route } = fixture();
  const url = new URL("https://example.clerk.accounts.dev/v1/client/sign_ins");
  const headers = new Headers({ authorization: "synthetic-test-token", "x-mobile": "1" });
  const body = new URLSearchParams({ strategy: "email_code" });
  const req = { url, headers, body, method: "POST", credentials: "omit" };
  route(req);
  assert.equal(req.url, url);
  assert.equal(req.headers, headers);
  assert.equal(req.body, body);
  assert.equal(req.headers.get("authorization"), "synthetic-test-token");
  assert.equal(req.headers.get("x-mobile"), "1");
  assert.equal(req.method, "POST");
  assert.equal(req.credentials, "omit");
});

test("leaves external, unrelated, already-proxied, and missing URLs unchanged", () => {
  const { route } = fixture();
  for (const value of [
    "https://accounts.google.com/v1/client",
    "https://example.clerk.accounts.dev.evil.test/v1/client",
    "https://example.clerk.accounts.dev:444/v1/client",
    "http://example.clerk.accounts.dev/v1/client",
    "https://example.clerk.accounts.dev/npm/clerk.js",
    `${proxy}/v1/client`,
  ]) {
    const req = { url: new URL(value) };
    route(req);
    assert.equal(req.url.href, value);
  }
  assert.doesNotThrow(() => route({}));
});

test("installs once per singleton without replacing its existing hooks", () => {
  const { clerk, callbacks } = fixture();
  installNativeClerkProxy(clerk, proxy);
  assert.equal(callbacks.length, 1);
  const next = fixture();
  assert.equal(next.callbacks.length, 1);
});

test("rejects unsafe or malformed proxy configuration before registering", () => {
  for (const value of [
    "", "http://ctl.example.test/api/__clerk", "https://ctl.example.test/",
    "https://user:password@ctl.example.test/api/__clerk",
    `${proxy}?token=example`, `${proxy}#example`,
  ]) {
    let registered = false;
    const clerk = {
      frontendApi: "example.clerk.accounts.dev",
      __unstable__onBeforeRequest() { registered = true; },
    };
    assert.throws(() => installNativeClerkProxy(clerk, value));
    assert.equal(registered, false);
  }
});

test("accepts a trailing slash without doubling slashes", () => {
  const callbacks = [];
  installNativeClerkProxy({
    frontendApi: "example.clerk.accounts.dev",
    __unstable__onBeforeRequest(fn) { callbacks.push(fn); },
    __unstable__onAfterResponse() {},
  }, `${proxy}/`);
  const req = { url: new URL("https://example.clerk.accounts.dev/v1/environment") };
  callbacks[0](req);
  assert.equal(req.url.href, `${proxy}/v1/environment`);
});

test("fails explicitly if an SDK upgrade removes the native request hook", () => {
  assert.throws(
    () => installNativeClerkProxy({ frontendApi: "example.clerk.accounts.dev" }, proxy),
    /does not support/,
  );
});

test("installed Clerk SDK sends a rerouted request with native headers intact", () => {
  // Run headless Clerk in an isolated process: its telemetry timers must not
  // keep the test runner alive. Mock fetch so no account or network is touched.
  const path = require("node:path");
  const { spawnSync } = require("node:child_process");
  const loader = require.resolve("tsx", { paths: [path.resolve(__dirname, "../../api-server")] });
  const result = spawnSync(process.execPath, ["--import", loader, "-e", `
    const { createRequire } = require("node:module");
    const assert = require("node:assert/strict");
    const appRequire = createRequire(process.argv[1] + "/package.json");
    const expoRequire = createRequire(appRequire.resolve("@clerk/clerk-expo"));
    const { Clerk } = expoRequire("@clerk/clerk-js/headless");
    const { installNativeClerkProxy } = appRequire("./lib/nativeClerkProxy.ts");
    const key = "pk_live_" + Buffer.from("example.clerk.accounts.dev$").toString("base64");
    const calls = [];
    global.fetch = async (url, init) => {
      calls.push({ ...init, url: String(url) });
      const payload = String(url).includes("/v1/environment")
        ? { display_config: { instance_environment_type: "production" } }
        : { response: { object: "sign_in", status: "needs_second_factor" } };
      return new Response(JSON.stringify(payload),
        { status: 200, headers: { "content-type": "application/json" } });
    };
    const clerk = new Clerk(key);
    let originalBody;
    clerk.__unstable__onBeforeRequest(async request => {
      request.credentials = "omit";
      request.url.searchParams.append("_is_native", "1");
      request.headers.set("authorization", "synthetic-test-token");
      request.headers.set("x-mobile", "1");
      originalBody = request.body;
    });
    installNativeClerkProxy(clerk, "https://ctl.example.test/api/__clerk");
    clerk.getFapiClient().request({ method: "GET", path: "/environment" }).then(() => clerk.getFapiClient().request({
      method: "POST", path: "/client/sign_ins/example/prepare_second_factor",
      body: new URLSearchParams({ strategy: "email_code" }),
    })).then(response => {
      const call = calls.find(x => x.url.includes("prepare_second_factor"));
      assert.ok(call);
      assert.ok(call.url.startsWith("https://ctl.example.test/api/__clerk/v1/client/sign_ins/example/prepare_second_factor?"));
      assert.equal(new URL(call.url).searchParams.get("_is_native"), "1");
      assert.equal(call.headers.get("authorization"), "synthetic-test-token");
      assert.equal(call.headers.get("x-mobile"), "1");
      assert.equal(call.method, "POST");
      assert.equal(call.credentials, "omit");
      assert.equal(call.body, originalBody);
      assert.equal(response.payload.response.status, "needs_second_factor");
      process.exit(0);
    }).catch(error => { console.error(error); process.exit(1); });
  `, path.resolve(__dirname, "..")], { timeout: 10000, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

test("blocks credentials until a successful production environment response", () => {
  const { route, environment } = fixture(false);
  const post = () => ({ method: "POST", url: new URL("https://example.clerk.accounts.dev/v1/client/sign_ins") });
  assert.throws(() => route(post()), /has not been verified/);
  environment("development");
  assert.throws(() => route(post()), /has not been verified/);
  environment("production", 500);
  assert.throws(() => route(post()), /has not been verified/);
  environment("production");
  assert.doesNotThrow(() => route(post()));
});

test("missing environment metadata fails closed", () => {
  const { route, environment } = fixture(false);
  environment(undefined);
  assert.throws(() => route({
    method: "POST", url: new URL("https://example.clerk.accounts.dev/v1/client/sign_ups"),
  }), /has not been verified/);
});
