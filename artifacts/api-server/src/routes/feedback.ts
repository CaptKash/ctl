import { Router } from "express";
import { Resend } from "resend";
import { requireAuth } from "../middlewares/auth";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "CTL App <noreply@inroomstudios.com>";
const SUPPORT_EMAIL = "ctl.support@inroomstudio.com";

const router = Router();

router.post("/feedback", requireAuth, async (req, res) => {
  const { category, message } = req.body as { category?: string; message?: string };
  const user = (req as any).user as { id: number; name: string; email: string };

  if (!message || message.trim().length < 5) {
    res.status(400).json({ error: "Message is too short." });
    return;
  }

  const cat = category ?? "General";
  const subject = `[CTL Feedback] ${cat} — from ${user.name}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <p style="font-size:13px;color:#9CA3AF;margin:0 0 20px">CTL App — User Feedback</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="font-size:13px;color:#6B7280;padding:6px 0;width:90px">From</td>
          <td style="font-size:14px;color:#111827">${user.name} &lt;${user.email}&gt;</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6B7280;padding:6px 0">Category</td>
          <td style="font-size:14px;color:#111827">${cat}</td>
        </tr>
      </table>
      <div style="background:#F9FAFB;border-radius:10px;padding:16px;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap">${message.trim()}</div>
    </div>
  `;

  if (resend) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject,
      html,
    });
  } else {
    console.log(`[feedback] ${subject}\n${message}`);
  }

  res.json({ ok: true });
});

export default router;
