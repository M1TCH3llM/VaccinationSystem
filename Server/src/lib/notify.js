// server/src/lib/notify.js
const { sendMail } = require("./mailer");

async function notifyBooking(p) {
  const to = p.patientEmail;
  if (!to) return { ok: false, reason: "missing patientEmail" };

  const subject = `Your vaccine appointment is scheduled (${p.startAtIso})`;
  const text = [
    `Hi ${p.patientName || "there"},`,
    ``,
    `Your appointment has been scheduled:`,
    `• Hospital: ${p.hospitalName}`,
    `• Vaccine:  ${p.vaccineName}`,
    `• When:     ${p.startAtIso}`,
    `• Dose:     ${p.doseNumber} of ${p.dosesRequired}`,
    `• Charges:  $${Number(p.charges).toFixed(2)}`,
    ``,
    `Appointment ID: ${p.appointmentId}`,
    ``,
    `Thank you!`,
  ].join("\n");

  return sendMail({ to, subject, text });
}

async function notifyPaymentConfirmed(p) {
  const to = p.patientEmail;
  if (!to) return { ok: false, reason: "missing patientEmail" };

  const subject = `Payment confirmed — Ref ${p.reference}`;
  const text = [
    `Hi ${p.patientName || "there"},`,
    ``,
    `We received your payment.`,
    `• Amount:   $${Number(p.amount).toFixed(2)}`,
    `• Ref:      ${p.reference}`,
    ``,
    `Appointment:`,
    `• ID:       ${p.appointmentId}`,
    `• When:     ${p.startAtIso}`,
    `• Hospital: ${p.hospitalName || "-"}`,
    `• Vaccine:  ${p.vaccineName || "-"}`,
    ``,
    `See you at your appointment!`,
  ].join("\n");

  return sendMail({ to, subject, text });
}

module.exports = {
  notifyBooking,
  notifyPaymentConfirmed,
};
