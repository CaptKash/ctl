import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RESET_BASE_URL = process.env.RESET_BASE_URL ?? "http://localhost:3000";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "CTL App <noreply@inroomstudios.com>";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "ctl-logbook-secret-2025";
const SALT_ROUNDS = 10;

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db
      .insert(usersTable)
      .values({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash })
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: "90d",
    });

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: "90d",
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.get("/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided." });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; name: string };

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, payload.id))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found." });

    res.json({ user });
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});


router.delete("/auth/account", requireAuth, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.user!.id));
    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (user) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const [record] = await db
        .insert(passwordResetTokensTable)
        .values({ userId: user.id, expiresAt })
        .returning({ token: passwordResetTokensTable.token });

      const resetLink = `${RESET_BASE_URL}/api/reset-password?token=${record.token}`;
      console.log(`[forgot-password] Reset link for ${user.email}: ${resetLink}`);

      if (resend) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: "Reset your CTL password",
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
              <div style="margin-bottom:24px">
                <span style="font-size:28px;font-weight:800;color:#0F2D5E;letter-spacing:-1px">CTL</span>
                <div style="display:inline-block;width:48px;height:4px;background:#1D4ED8;border-radius:2px;vertical-align:middle;margin-left:8px"></div>
                <div style="display:inline-block;width:20px;height:4px;background:#0891B2;border-radius:2px;vertical-align:middle;margin-left:4px"></div>
              </div>
              <h2 style="color:#111827;font-size:20px;margin:0 0 12px">Reset your password</h2>
              <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px">
                Hi ${user.name}, we received a request to reset your CTL password. Click the button below — this link expires in 1 hour.
              </p>
              <a href="${resetLink}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
                Reset Password
              </a>
              <p style="color:#9CA3AF;font-size:13px;margin:24px 0 0">
                If you didn't request this, you can safely ignore this email. Your password won't change.
              </p>
            </div>
          `,
        });
      }
    }

    res.json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token?.trim() || !password) {
      return res.status(400).json({ error: "Token and new password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token.trim()),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, record.userId));
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, record.id));

    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.get("/reset-password", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Reset Password – CTL</title>
  <link rel="preconnect" href="https://fonts.bunny.net"/>
  <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800&display=block" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#F3F4F6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:20px;padding:40px 32px;max-width:420px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:32px}
    .logo-text{font-size:28px;font-weight:800;color:#0F2D5E;letter-spacing:-1px;font-family:'Inter',system-ui,sans-serif}
    .logo-lines{display:flex;gap:4px;align-items:center}
    .line-blue{width:36px;height:4px;background:#1D4ED8;border-radius:2px}
    .line-teal{width:16px;height:4px;background:#0891B2;border-radius:2px}
    h1{font-size:22px;font-weight:700;color:#111827;margin-bottom:8px}
    .sub{color:#6B7280;font-size:14px;line-height:1.5;margin-bottom:28px}
    label{display:block;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
    input{width:100%;padding:13px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:15px;color:#111;outline:none;transition:border-color .15s}
    input:focus{border-color:#1D4ED8}
    .field{margin-bottom:16px}
    button{width:100%;background:#1D4ED8;color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;transition:opacity .15s}
    button:hover{opacity:.9}
    button:disabled{opacity:.5;cursor:not-allowed}
    .msg{border-radius:10px;padding:12px 14px;font-size:14px;margin-top:16px;display:none}
    .msg.error{background:#FEF2F2;color:#DC2626}
    .msg.success{background:#F0FDF4;color:#16A34A}
    .expired{text-align:center;padding:16px 0}
    .expired p{color:#6B7280;font-size:15px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <span class="logo-text">CTL</span>
      <div class="logo-lines">
        <div class="line-blue"></div>
        <div class="line-teal"></div>
      </div>
    </div>

    <div id="form-section">
      <h1>Set new password</h1>
      <p class="sub">Choose a strong password for your CTL account. Must be at least 6 characters.</p>
      <div class="field">
        <label for="pw">New Password</label>
        <input id="pw" type="password" placeholder="••••••••" autocomplete="new-password"/>
      </div>
      <div class="field">
        <label for="pw2">Confirm Password</label>
        <input id="pw2" type="password" placeholder="••••••••" autocomplete="new-password"/>
      </div>
      <button id="btn" onclick="submit()">Update Password</button>
      <div class="msg error" id="err"></div>
      <div class="msg success" id="ok"></div>
    </div>

    <div id="no-token" class="expired" style="display:none">
      <p>This link is invalid or has expired.<br/>Please request a new password reset from the app.</p>
    </div>
  </div>

  <script>
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      document.getElementById('form-section').style.display = 'none';
      document.getElementById('no-token').style.display = 'block';
    }

    async function submit() {
      const pw = document.getElementById('pw').value;
      const pw2 = document.getElementById('pw2').value;
      const btn = document.getElementById('btn');
      const err = document.getElementById('err');
      const ok = document.getElementById('ok');

      err.style.display = 'none';
      ok.style.display = 'none';

      if (pw.length < 6) { show(err, 'Password must be at least 6 characters.'); return; }
      if (pw !== pw2) { show(err, 'Passwords do not match.'); return; }

      btn.disabled = true;
      btn.textContent = 'Updating…';

      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: pw }),
        });
        const data = await res.json();
        if (!res.ok) { show(err, data.error || 'Something went wrong.'); btn.disabled = false; btn.textContent = 'Update Password'; return; }
        show(ok, 'Password updated! You can now sign in to the CTL app.');
        document.getElementById('form-section').querySelectorAll('input,button').forEach(el => el.disabled = true);
      } catch {
        show(err, 'Network error. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    }

    function show(el, msg) { el.textContent = msg; el.style.display = 'block'; }
  </script>
</body>
</html>`);
});

export default router;
