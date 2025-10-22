// server/src/lib/mailer.js
const ENABLE_REAL_SEND = false; // keep false for now

let transporter = null;

async function getTransporter() {
  if (!ENABLE_REAL_SEND) return null;

  // Example Nodemailer SMTP config (disabled by default)
  if (!transporter) {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

//fake send mail
async function sendMail({ to, subject, text, html }) {
  if (!to || !subject) {
    throw new Error("to and subject are required");
  }

  if (!ENABLE_REAL_SEND) {
    console.log("📧 [MOCK EMAIL]");
    console.log("To:     ", to);
    console.log("Subject:", subject);
    if (text) console.log("Text:   ", text);
    if (html) console.log("HTML:   ", html);
    console.log("—");
    return { ok: true };
  }

  const tx = await getTransporter();
  const info = await tx.sendMail({
    from: process.env.MAIL_FROM || "no-reply@vax.local",
    to,
    subject,
    text,
    html,
  });
  return { ok: true, messageId: info.messageId };
}

module.exports = { sendMail };
