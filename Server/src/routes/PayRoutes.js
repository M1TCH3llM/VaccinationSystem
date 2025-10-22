// server/src/routes/payments.js
const express = require("express");
const jwt = require("jsonwebtoken");
const Appointment = require("../../model/Appointments");
const Payment = require("../../model/Payment");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

//  async wrapper
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Bearer auth -> req.userId
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing bearer token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

// Build QR payload string
function buildQrPayload(payment) {
  return `VXPAY|${payment.reference}|${payment.amount}|${payment.appointment}`;
}

// Post 
router.post("/initiate", requireAuth, asyncH(async (req, res) => {
  const { appointmentId } = req.body || {};
  if (!appointmentId) return res.status(400).json({ error: "appointmentId is required" });

  const appt = await Appointment.findById(appointmentId)
    .populate("hospital", "name")
    .populate("vaccine", "name")
    .exec();

  if (!appt) return res.status(404).json({ error: "appointment not found" });
  if (String(appt.patient) !== String(req.userId)) {
    return res.status(403).json({ error: "not your appointment" });
  }
  if (!["SCHEDULED"].includes(appt.status)) {
    return res.status(409).json({ error: `cannot initiate payment for status ${appt.status}` });
  }

  // Create (or reuse) a PENDING payment for this appointment
  let payment = await Payment.findOne({ appointment: appt._id, patient: req.userId, status: Payment.STATUS.PENDING });
  if (!payment) {
    payment = await Payment.create({
      appointment: appt._id,
      patient: req.userId,
      amount: appt.charges,
      method: Payment.METHODS.QR,
      status: Payment.STATUS.PENDING,
      hospitalName: appt.hospital?.name || "",
      vaccineName: appt.vaccine?.name || "",
      doseNumber: appt.doseNumber,
    });
  }

  const qrPayload = buildQrPayload(payment);
  res.status(201).json({ payment, qrPayload });
}));

// Post
router.post("/confirm", requireAuth, asyncH(async (req, res) => {
  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ error: "reference is required" });

  const payment = await Payment.findOne({ reference, patient: req.userId });
  if (!payment) return res.status(404).json({ error: "payment not found" });

  if (payment.status !== Payment.STATUS.PENDING) {
    return res.status(409).json({ error: `payment already ${payment.status}` });
  }

  // Update payment -> CONFIRMED
  payment.status = Payment.STATUS.CONFIRMED;
  payment.confirmedAt = new Date();
  await payment.save();

  // Update appointment -> PAID 
  const appt = await Appointment.findById(payment.appointment);
  if (appt && appt.status === "SCHEDULED") {
    appt.status = "PAID";
    appt.notes.push({ at: new Date(), by: "system", message: "Payment confirmed (mock)" });
    await appt.save();
  }

  res.json({ payment, appointmentStatus: appt?.status || null });
}));

//Get 
router.get("/my", requireAuth, asyncH(async (req, res) => {
  const payments = await Payment.find({ patient: req.userId })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ payments });
}));

module.exports = router;
