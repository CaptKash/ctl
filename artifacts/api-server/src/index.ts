import app from "./app";
import { startBackupScheduler } from "./backup";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startBackupScheduler();
  registerClerkRedirectUrls();
});

async function registerClerkRedirectUrls() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return;
  // Run for both sk_test_ and sk_live_ — registrations on the test instance are
  // visible in dev and confirm the mechanism works; the production deployment uses
  // sk_live_ so it registers on the live instance (which the TestFlight build hits).

  const REQUIRED = [
    "https://ctl-car-technical-log.replit.app/api/sso-callback",
    "car-logbook://sso-callback",
  ];

  try {
    // Log instance config to diagnose native_api_disabled errors on iOS.
    const instanceRes = await fetch("https://api.clerk.com/v1/instance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const instanceData = (await instanceRes.json()) as Record<string, unknown>;
    const experimental = instanceData?.experimental as Record<string, unknown> | undefined;
    console.log("[clerk-instance] status:", instanceRes.status,
      "| native_app_support:", experimental?.native_app_support ?? "not found",
      "| keys:", Object.keys(experimental ?? {}).join(", ") || "none"
    );

    const listRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const existing = (await listRes.json()) as Array<{ url: string }>;
    const existingUrls = new Set(existing.map((r) => r.url));

    for (const url of REQUIRED) {
      if (existingUrls.has(url)) continue;
      await fetch("https://api.clerk.com/v1/redirect_urls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      console.log(`[clerk] registered redirect URL: ${url}`);
    }
  } catch (err) {
    console.warn("[clerk] failed to register redirect URLs:", err);
  }
}
