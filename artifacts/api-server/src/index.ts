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
    "car-logbook://",
  ];

  const keyPrefix = secretKey.slice(0, 15);

  try {
    // Log instance config — including instance ID so we can confirm which instance we're hitting.
    const instanceRes = await fetch("https://api.clerk.com/v1/instance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const instanceData = (await instanceRes.json()) as Record<string, unknown>;
    const instanceId = instanceData?.id ?? "unknown";
    const envType = instanceData?.environment_type ?? "unknown";
    const experimental = instanceData?.experimental as Record<string, unknown> | undefined;
    console.log(
      "[clerk-instance] status:", instanceRes.status,
      "| id:", instanceId,
      "| env:", envType,
      "| key_prefix:", keyPrefix,
      "| native_app_support:", experimental?.native_app_support ?? "not found",
    );

    const listRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const listBody = (await listRes.json()) as Array<{ id: string; url: string }>;
    const existingUrls = new Set(listBody.map((r) => r.url));
    console.log("[clerk-redirect-urls] list status:", listRes.status,
      "| existing:", JSON.stringify([...existingUrls]));

    for (const url of REQUIRED) {
      if (existingUrls.has(url)) {
        console.log(`[clerk-redirect-urls] already registered: ${url}`);
        continue;
      }
      const regRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const regBody = await regRes.text();
      console.log(`[clerk-redirect-urls] register "${url}" → HTTP ${regRes.status} | body: ${regBody.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[clerk-redirect-urls] failed:", err);
  }
}
