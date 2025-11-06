const express = require("express");
const crypto = require("crypto");
// --- FIX: Corrected paths. Assuming middleware/ and model/ are two levels up ---
const {
  requireAuth,
  requireRole,
  requireApproved,
} = require("../../middleware/auth"); 
const User = require("../../model/User"); 
const Appointment = require("../../model/Appointments"); 
const Payment = require("../../model/Payment"); // The new model
const Hospital = require("../../model/Hospital"); 
const Vaccine = require("../../model/Vaccine"); 

const router = express.Router();

// Corrected asyncH (this was fine, but including for completeness)
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @route   GET /api/payments/my
 * @desc    List payments for the logged-in patient
 * @access  Private (Patient)
 */
router.get(
  "/my",
  requireAuth,
  requireRole(User.ROLES.PATIENT),
  // --- FIX: Corrected = to => ---
  asyncH(async (req, res) => { 
    const payments = await Payment.find({
      patient: req.user.sub, // req.user.sub is set by requireAuth
    }).sort({ createdAt: -1 });

    res.json({ payments });
  })
);

/**
 * @route   POST /api/payments/initiate
 * @desc    Start a new payment for an appointment
 * @access  Private (Patient)
 */
router.post(
  "/initiate",
  requireAuth,
  requireRole(User.ROLES.PATIENT),
  requireApproved,
  // --- FIX: Corrected = to => ---
  asyncH(async (req, res) => {
    const { appointmentId } = req.body;
    const patientId = req.user.sub;

    const appointment = await Appointment.findById(appointmentId)
      .populate("hospital", "name")
      .populate("vaccine", "name");

    // --- Validations ---
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    if (String(appointment.patient) !== patientId) {
      return res.status(403).json({ error: "Cannot pay for another patient's appointment" });
    }
    if (appointment.status !== "SCHEDULED") {
      return res.status(409).json({ error: "Appointment is not in scheduled state. It may already be paid or completed." });
    }
    
    // Check if a payment is already pending
    let payment = await Payment.findOne({
      appointment: appointmentId,
      status: Payment.STATUS.PENDING, // Using the correct static
    });

    if (payment) {
      // Return existing pending payment
      return res.json({ payment, qrPayload: payment.qrPayload });
    }

    // --- Create a new payment ---
    const reference = crypto.randomBytes(8).toString("hex").toUpperCase();
    const amount = appointment.charges;
    const hospitalName = appointment.hospital?.name || "N/A";
    const vaccineName = appointment.vaccine?.name || "N/A";

    // This is just a mock QR payload for the demo
    const qrPayload = JSON.stringify({
      reference,
      amount,
      patientId,
      appointmentId,
      hospitalName,
      vaccineName,
    });

    payment = new Payment({
      patient: patientId,
      appointment: appointmentId,
      hospital: appointment.hospital._id,
      reference,
      amount,
      status: Payment.STATUS.PENDING, // Correct
      qrPayload,
      hospitalName,
      vaccineName,
    });

    await payment.save();
    res.status(201).json({ payment, qrPayload });
  })
);

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirms a payment (mock). This is the "bridge"!
 * @access  Private (Patient)
 */
router.post(
  "/confirm",
  requireAuth,
  requireRole(User.ROLES.PATIENT),
  requireApproved,
  // --- FIX: Corrected = to => ---
  asyncH(async (req, res) => {
    const { reference } = req.body;
    const patientId = req.user.sub;

    const payment = await Payment.findOne({
      reference: reference,
      patient: patientId,
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment reference not found or does not belong to user" });
    }

    if (payment.status === Payment.STATUS.PAID) {
      return res.json({ payment, appointmentStatus: "PAID" });
    }
    
    if (payment.status !== Payment.STATUS.PENDING) {
      return res.status(409).json({ error: `Payment is in an invalid state: ${payment.status}` });
    }

    // --- THIS IS THE CRITICAL STEP ---
    // 1. Mark the Payment as "PAID"
    payment.status = Payment.STATUS.PAID;
    payment.paidAt = new Date();
    await payment.save();

    // 2. Find the Appointment and mark it as "PAID"
    await Appointment.findByIdAndUpdate(payment.appointment, {
      status: "PAID",
      $push: {
          notes: {
            at: new Date(),
            by: "system",
            message: `Payment confirmed (Ref: ${reference})`,
          },
        },
    });

    // ---------------------------------

    res.json({ payment, appointmentStatus: "PAID" });
  })
);

module.exports = router;