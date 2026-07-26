import { Router } from "express";

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_SETUP_TOKEN || "ctl-admin-setup-2026";

router.post("/admin/setup-clerk-redirect", async (req, res) => {
  const auth = req.headers["x-admin-token"];
  if (auth !== ADMIN_TOKEN) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith("sk_live")) {
    res.status(500).json({ error: "production Clerk secret key not available", prefix: secretKey?.slice(0, 8) });
    return;
  }

  const URL_TO_ADD = "https://ctl-car-technical-log.replit.app/api/sso-callback";

  try {
    const listRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const existing: Array<{ url: string }> = await listRes.json();
    const alreadyExists = existing.some((r) => r.url === URL_TO_ADD);

    if (alreadyExists) {
      res.json({ status: "already_exists", urls: existing.map(r => r.url) });
      return;
    }

    const addRes = await fetch("https://api.clerk.com/v1/redirect_urls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: URL_TO_ADD })
    });

    const added = await addRes.json();

    res.json({
      status: addRes.ok ? "added" : "error",
      statusCode: addRes.status,
      result: added
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
