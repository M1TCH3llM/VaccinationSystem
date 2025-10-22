// server/src/routes/appointments.js
const express = require("express");
const jwt = require("jsonwebtoken");
const Appointment = require("../../model/Appointments");
const Hospital = require("../../model/Hospital");
const Vaccine = require("../../model/Vaccine");
const { generateSlots, clampToWindow, toIsoNoMs } = require("../lib/slots");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

//   async wrapper
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

//  auth middleware 
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing bearer token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub;
    req.userRole = decoded.role;
    req.isApproved = !!decoded.approved;
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

//Get
router.get("/availability", asyncH(async (req, res) => {
  const { hospitalId, date } = req.query || {};
  if (!hospitalId || !date) {
    return res.status(400).json({ error: "hospitalId and date (YYYY-MM-DD) are required" });
  }

  const hospital = await Hospital.findById(hospitalId).lean();
  if (!hospital) return res.status(404).json({ error: "hospital not found" });
  if (!hospital.isApproved) return res.status(403).json({ error: "hospital not approved" });

  // Build all potential slots for the day
  const day = new Date(`${date}T00:00:00`);
  if (Number.isNaN(day.getTime())) return res.status(400).json({ error: "invalid date" });

  const slots = generateSlots(day);

  // Fetch existing bookings for that hospital on that day (exclude CANCELLED/NO_SHOW from blocking)
  const dayStart = new Date(day);
  const dayEnd = new Date(day); dayEnd.setDate(day.getDate() + 1);

  const blocking = await Appointment.find({
    hospital: hospital._id,
    startAt: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ["SCHEDULED", "PAID", "COMPLETED"] },
  }).select("startAt endAt").lean();

  // Build a Set of start times (ms) that are already booked
  const busy = new Set(blocking.map(b => +new Date(b.startAt)));

  const available = slots
    .filter(s => !busy.has(+s.startAt))
    .map(s => ({ startAt: toIsoNoMs(s.startAt), endAt: toIsoNoMs(s.endAt), durationMin: s.durationMin }));

  res.json({ hospitalId: String(hospital._id), date, available });
}));

// Post
router.post("/", requireAuth, asyncH(async (req, res) => {
  const { hospitalId, vaccineId, startAt } = req.body || {};
  if (!hospitalId || !vaccineId || !startAt) {
    return res.status(400).json({ error: "hospitalId, vaccineId and startAt are required" });
  }
  if (!req.isApproved) {
    return res.status(403).json({ error: "user not approved yet" });
  }

  const [hospital, vaccine] = await Promise.all([
    Hospital.findById(hospitalId),
    Vaccine.findById(vaccineId),
  ]);
  if (!hospital) return res.status(404).json({ error: "hospital not found" });
  if (!hospital.isApproved) return res.status(403).json({ error: "hospital not approved" });
  if (!vaccine) return res.status(404).json({ error: "vaccine not found" });

  // Validate slot is within daily window 
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "invalid startAt" });

  const slot = clampToWindow(start, 30);
  if (!slot) return res.status(400).json({ error: "startAt outside allowed window (09:00–18:00)" });

  // Determine which dose number this would be:
  // Count completed doses of this vaccine for this patient
  const completedCount = await Appointment.countDocuments({
    patient: req.userId,
    vaccine: vaccine._id,
    status: "COMPLETED",
  });

  const doseNumber = completedCount + 1;
  if (doseNumber > vaccine.dosesRequired) {
    return res.status(409).json({ error: "all required doses already completed" });
  }

  // Snapshot charges for this appointment
  const charges = Number(hospital.charges || 0) + Number(vaccine.price || 0);

  // Try to create the appointment 
  const appt = new Appointment({
    patient: req.userId,
    hospital: hospital._id,
    vaccine: vaccine._id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    durationMin: slot.durationMin,
    doseNumber,
    dosesRequired: vaccine.dosesRequired,
    charges,
    status: "SCHEDULED",
    notes: [{ at: new Date(), by: "system", message: "Booked by patient" }],
  });

  try {
    await appt.save();
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "slot already booked" });
    }
    throw e;
  }

  // Return the newly created appointment
  res.status(201).json(appt.toJSON());
}));

// Get User Appointments
router.get("/my", requireAuth, asyncH(async (req, res) => {
  const list = await Appointment.find({ patient: req.userId })
    .populate("hospital", "name address type")
    .populate("vaccine", "name type dosesRequired")
    .sort({ startAt: 1 })
    .lean();

  res.json({ appointments: list });
}));

module.exports = router;
