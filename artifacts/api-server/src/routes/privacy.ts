import { Router } from "express";

const router = Router();

router.get("/privacy", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Privacy Policy – CTL</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#F3F4F6;min-height:100vh;padding:40px 24px 80px}
    .wrap{max-width:680px;margin:0 auto}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:48px}
    .logo-text{font-size:28px;font-weight:800;color:#0F2D5E;letter-spacing:-1px;font-family:'Inter',sans-serif}
    .logo-lines{display:flex;gap:4px;align-items:center}
    .line-blue{width:36px;height:4px;background:#1D4ED8;border-radius:2px}
    .line-teal{width:16px;height:4px;background:#0891B2;border-radius:2px}
    h1{font-size:30px;font-weight:800;color:#0F2D5E;margin-bottom:8px}
    .effective{font-size:13px;color:#9CA3AF;margin-bottom:40px}
    h2{font-size:17px;font-weight:700;color:#111827;margin:36px 0 10px}
    p{font-size:15px;color:#374151;line-height:1.7;margin-bottom:12px}
    ul{padding-left:20px;margin-bottom:12px}
    ul li{font-size:15px;color:#374151;line-height:1.7;margin-bottom:6px}
    a{color:#1D4ED8;text-decoration:none}
    a:hover{text-decoration:underline}
    .divider{height:1px;background:#E5E7EB;margin:40px 0}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <span class="logo-text">CTL</span>
      <div class="logo-lines">
        <div class="line-blue"></div>
        <div class="line-teal"></div>
      </div>
    </div>

    <h1>Privacy Policy</h1>
    <p class="effective">Effective date: March 24, 2026</p>

    <p>Car Technical Log ("CTL", "we", "our", or "us") is a mobile application that helps you track maintenance and service records for your vehicles. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.</p>

    <div class="divider"></div>

    <h2>1. Information We Collect</h2>
    <p>We collect the following information when you create an account and use CTL:</p>
    <ul>
      <li><strong>Account information:</strong> your name and email address, and a hashed (encrypted) version of your password — we never store your password in plain text.</li>
      <li><strong>Vehicle information:</strong> details you enter about your cars, such as make, model, year, licence plate, VIN, and notes.</li>
      <li><strong>Maintenance records:</strong> service entries you log, including dates, mileage, service type, cost, and any notes or attachments you add.</li>
    </ul>
    <p>We do not collect location data, contacts, or any other device information.</p>

    <h2>2. How We Use Your Information</h2>
    <p>We use the information you provide solely to operate the CTL service:</p>
    <ul>
      <li>To create and manage your account.</li>
      <li>To store and display your vehicle and maintenance records.</li>
      <li>To send transactional emails you request, such as password reset emails.</li>
    </ul>
    <p>We do not use your data for advertising, profiling, or any purpose beyond providing the app.</p>

    <h2>3. Data Storage and Security</h2>
    <p>Your data is stored in a secure, private database. We take reasonable technical measures to protect your information, including encrypted passwords and secure HTTPS connections for all data in transit.</p>
    <p>No system is completely immune to security risks. If you become aware of any security issue, please contact us immediately at <a href="mailto:ctl.support@inroomstudio.com">ctl.support@inroomstudio.com</a>.</p>

    <h2>4. Third-Party Services</h2>
    <p>We use the following third-party service to operate CTL:</p>
    <ul>
      <li><strong>Resend</strong> (<a href="https://resend.com/privacy" target="_blank">resend.com/privacy</a>) — used to deliver transactional emails such as password resets. Your email address is shared with Resend only when sending these messages.</li>
    </ul>
    <p>We do not sell, rent, or share your personal data with any other third parties.</p>

    <h2>5. Data Retention</h2>
    <p>We retain your account and vehicle data for as long as your account is active. If you wish to delete your account and all associated data, contact us at <a href="mailto:ctl.support@inroomstudio.com">ctl.support@inroomstudio.com</a> and we will process your request within 30 days.</p>

    <h2>6. Children's Privacy</h2>
    <p>CTL is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with their information, please contact us and we will delete it promptly.</p>

    <h2>7. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you.</li>
      <li>Request correction of inaccurate data.</li>
      <li>Request deletion of your account and all associated data.</li>
    </ul>
    <p>To exercise any of these rights, email us at <a href="mailto:ctl.support@inroomstudio.com">ctl.support@inroomstudio.com</a>.</p>

    <h2>8. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page. Continued use of the app after changes are posted constitutes your acceptance of the updated policy.</p>

    <h2>9. Contact Us</h2>
    <p>If you have any questions about this Privacy Policy or your data, please reach out:</p>
    <p><strong>Email:</strong> <a href="mailto:ctl.support@inroomstudio.com">ctl.support@inroomstudio.com</a></p>
    <p><strong>App:</strong> Car Technical Log (CTL)</p>
    <p><strong>Developer:</strong> Inroom Studios</p>
  </div>
</body>
</html>`);
});

export default router;
