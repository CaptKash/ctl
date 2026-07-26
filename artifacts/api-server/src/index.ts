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
  if (!secretKey || !secretKey.startsWith("sk_live")) return;

  const REQUIRED = [
    "https://ctl-car-technical-log.replit.app/api/sso-callback",
    "car-logbook://sso-callback",
  ];

  try {
    const listRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const existing: Array<{ url: string }> = await listRes.json();
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
