import { Router } from "express";
import { Resend } from "resend";
import { optionalAuth } from "../middlewares/auth";
import { checkRateLimit, getClientIp } from "../lib/rateLimit";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "CTL App <noreply@inroomstudios.com>";
const SUPPORT_EMAIL = "mkashour.apple@gmail.com";

const router = Router();

console.log("[feedback] Route loaded — using optionalAuth");

/**
 * Escape user-supplied strings before embedding in HTML email bodies.
 * Prevents HTML/CSS injection in support-team inboxes and user thank-you emails.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

router.post("/feedback", optionalAuth, async (req, res) => {
  // 5 feedback submissions per IP per hour — prevents Resend quota abuse.
  if (!checkRateLimit(`feedback:${getClientIp(req)}`, 5, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many feedback submissions. Please try again later." });
    return;
  }
  try {
    const { category, message } = req.body as { category?: string; message?: string };

    if (!message || message.trim().length < 5) {
      res.status(400).json({ error: "Message is too short." });
      return;
    }

    const userName  = req.user?.name  ?? (req.body as Record<string, string>).name  ?? "App User";
    const userEmail = req.user?.email ?? (req.body as Record<string, string>).email ?? null;
    const cat = category ?? "General Feedback";
    const subject = `[CTL Feedback] ${cat} — from ${userName}`;

    console.log(`[feedback] Received from ${userName}${userEmail ? ` <${userEmail}>` : ""}: ${cat}`);

    // Escape all user-supplied values before embedding in HTML to prevent
    // HTML/CSS injection in email clients (stored-XSS in email).
    const safeUserName  = escapeHtml(userName);
    const safeUserEmail = userEmail ? escapeHtml(userEmail) : null;
    const safeCat       = escapeHtml(cat);
    const safeMessage   = escapeHtml(message.trim());

    const feedbackHtml = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <p style="font-size:13px;color:#9CA3AF;margin:0 0 20px">CTL App — User Feedback</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr>
            <td style="font-size:13px;color:#6B7280;padding:6px 0;width:90px">From</td>
            <td style="font-size:14px;color:#111827">${safeUserName}${safeUserEmail ? ` &lt;${safeUserEmail}&gt;` : ""}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6B7280;padding:6px 0">Category</td>
            <td style="font-size:14px;color:#111827">${safeCat}</td>
          </tr>
        </table>
        <div style="background:#F9FAFB;border-radius:10px;padding:16px;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap">${safeMessage}</div>
      </div>
    `;

    const thankYouHtml = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <span style="font-size:26px;font-weight:800;color:#0F2D5E;letter-spacing:-1px">CTL</span>
          <div style="display:flex;gap:4px;align-items:center">
            <div style="width:32px;height:4px;background:#1D4ED8;border-radius:2px"></div>
            <div style="width:14px;height:4px;background:#0891B2;border-radius:2px"></div>
          </div>
        </div>
        <h2 style="color:#111827;font-size:20px;margin:0 0 10px">Thanks for your feedback, ${escapeHtml(userName.split(" ")[0])}!</h2>
        <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 20px">
          We've received your message and truly appreciate you taking the time to share it with us.
          Every piece of feedback helps us make CTL better.
        </p>
        <div style="background:#F3F4F6;border-radius:10px;padding:16px;margin-bottom:24px">
          <p style="font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px">Your message</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;white-space:pre-wrap">${safeMessage}</p>
        </div>
        <p style="color:#9CA3AF;font-size:13px;margin:0">
          If you reported a bug or need a follow-up, we'll get back to you at this email address.
        </p>
      </div>
    `;

    if (resend) {
      const sends = [
        resend.emails.send({
          from: FROM_EMAIL,
          to: [SUPPORT_EMAIL],
          replyTo: userEmail ?? undefined,
          subject,
          html: feedbackHtml,
        }),
      ];

      if (userEmail) {
        sends.push(
          resend.emails.send({
            from: FROM_EMAIL,
            to: [userEmail],
            subject: "We got your feedback — CTL",
            html: thankYouHtml,
          })
        );
      }

      await Promise.all(sends);
      console.log(`[feedback] Sent via Resend to ${SUPPORT_EMAIL}${userEmail ? ` + thank you to ${userEmail}` : ""}`);
    } else {
      console.log(`[feedback] No RESEND_API_KEY — ${subject}\n${message.trim()}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[feedback] Error:", err);
    res.status(500).json({ error: "Failed to send feedback. Please try again." });
  }
});

router.post("/suggest-tool", optionalAuth, async (req, res) => {
  // 5 suggestions per IP per hour — same Resend quota protection as /feedback.
  if (!checkRateLimit(`suggest:${getClientIp(req)}`, 5, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many suggestion submissions. Please try again later." });
    return;
  }
  try {
    const { suggestion, name, email } = req.body as { suggestion?: string; name?: string; email?: string };

    if (!suggestion || suggestion.trim().length < 5) {
      res.status(400).json({ error: "Suggestion is too short." });
      return;
    }

    const userName  = req.user?.name  ?? name  ?? "App User";
    const userEmail = req.user?.email ?? email ?? null;
    const subject = `[CTL] Tool Suggestion — from ${userName}`;

    console.log(`[suggest-tool] Received from ${userName}: ${suggestion.substring(0, 60)}`);

    const safeUserName  = escapeHtml(userName);
    const safeUserEmail = userEmail ? escapeHtml(userEmail) : null;
    const safeSuggestion = escapeHtml(suggestion.trim());

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <p style="font-size:13px;color:#9CA3AF;margin:0 0 20px">CTL App — Tool Suggestion</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr>
            <td style="font-size:13px;color:#6B7280;padding:6px 0;width:90px">From</td>
            <td style="font-size:14px;color:#111827">${safeUserName}${safeUserEmail ? ` &lt;${safeUserEmail}&gt;` : ""}</td>
          </tr>
        </table>
        <div style="background:#FEFCE8;border:1px solid #FDE047;border-radius:10px;padding:16px;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap">${safeSuggestion}</div>
      </div>
    `;

    if (resend) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [SUPPORT_EMAIL],
        replyTo: userEmail ?? undefined,
        subject,
        html,
      });
      console.log(`[suggest-tool] Sent via Resend to ${SUPPORT_EMAIL}`);
    } else {
      console.log(`[suggest-tool] No RESEND_API_KEY — ${subject}\n${suggestion.trim()}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[suggest-tool] Error:", err);
    res.status(500).json({ error: "Failed to send suggestion. Please try again." });
  }
});

export default router;
