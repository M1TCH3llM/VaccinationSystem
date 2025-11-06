// server/routes/api/admin.js
const express = require("express");
const User = require("../../../model/User"); 
const { requireAuth, requireRole } = require("../../../middleware/auth"); 
const Appointment = require("../../../model/Appointments");

const router = express.Router();

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  "/pending-patients",
  requireAuth,                  
  requireRole(User.ROLES.ADMIN), // 2. Must be an ADMIN
  asyncH(async (req, res) => {
    const patients = await User.find({
      role: User.ROLES.PATIENT,
      isApproved: false,
    }).select("-passwordHash -passwordSalt"); // Exclude sensitive fields

    res.json(patients);
  })
);

router.patch(
  "/approve-patient/:id",
  requireAuth,                  // 1. Must be logged in
  requireRole(User.ROLES.ADMIN), // 2. Must be an ADMIN
  asyncH(async (req, res) => {
    const { id } = req.params;

    const patient = await User.findOneAndUpdate(
      { _id: id, role: User.ROLES.PATIENT },
      { isApproved: true },
      { new: true } // Return the updated document
    ).select("-passwordHash -passwordSalt");

    if (!patient) {
      return res.status(404).json({ error: "Patient not found or already approved" });
    }

    res.json({ message: "Patient approved successfully", patient });
  })
);

router.get(
  "/appointments/pending-completion", 
  requireAuth,
  requireRole(User.ROLES.ADMIN),
  asyncH(async (req, res) => {
    const appointments = await Appointment.find({
      status: "PAID", 
    })
    .populate("patient", "name email") 
    .populate("hospital", "name")     
    .populate("vaccine", "name")      
    .sort({ startAt: 1 }); 

    res.json(appointments);
  })
);

router.patch(
  "/appointments/:id/complete", // <-- This route is still correct
  requireAuth,
  requireRole(User.ROLES.ADMIN),
  asyncH(async (req, res) => {
    const { id } = req.params;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      {
        status: "COMPLETED",
        $push: {
          notes: {
            at: new Date(),
            by: "admin",
            message: "Marked as completed by admin",
          },
        },
      },
      { new: true } 
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json(updatedAppointment);
  })
);


module.exports = router;