// server/src/routes/reports.js
const express = require("express");
const { mongoose } = require("../db");
const User = require("../../model/User");

// --- FIX 1: Correctly import the "Appointments" (plural) model ---
const Appointment = require("../../model/Appointments");

// --- FIX 2: Import your auth middleware ---
// (Adjust path if needed, e.g., ../../middleware/auth)
const { requireAuth, requireRole } = require("../../middleware/auth");

// --- FIX 3: The harmful try...catch block has been removed ---

const router = express.Router();

// Utility: "completed" statuses we’ll count as administered doses
const COMPLETED_STATUSES = ["COMPLETED", "ADMINISTERED", "DONE", "FINISHED"];

router.get(
  "/doses-per-day",
  // --- FIX 4: Secure the route ---
  requireAuth,
  requireRole(User.ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const days = Math.max(1, Math.min(90, Number(req.query.days) || 30));

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);

      const baseMatch = { startAt: { $gte: start, $lte: end } };
      const matchCompleted = { ...baseMatch, status: { $in: COMPLETED_STATUSES } };

      let pipeline = [
        { $match: matchCompleted },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$startAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];

      let rows = await Appointment.aggregate(pipeline);

      if (!rows || rows.length === 0) {
        pipeline[0] = { $match: baseMatch }; // Use the fallback match
        rows = await Appointment.aggregate(pipeline);
      }

      const series = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const hit = rows.find((r) => r._id === key);
        series.push({ date: key, count: Number(hit?.count || 0) });
      }

      res.json({ series });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/demographics",
  // --- FIX 4: Secure the route ---
  requireAuth,
  requireRole(User.ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const sinceParam = req.query.since ? new Date(req.query.since) : null;
      const match = {};
      if (sinceParam && !isNaN(sinceParam)) {
        match.startAt = { $gte: sinceParam };
      }

      // --- FIX 5: Use the correct "patient" field from your real model ---
      const pipeline = [
        { $match: match },
        {
          $project: {
            patient: "$patient", // Use the correct field name
          },
        },
        { $match: { patient: { $ne: null } } },
        {
          $lookup: {
            from: "users",
            localField: "patient",
            foreignField: "_id",
            as: "u",
          },
        },
        { $unwind: "$u" },
        {
          $match: {
            $or: [{ "u.role": "PATIENT" }, { "u.role": { $exists: false } }],
          },
        },
        {
          $project: {
            gender: { $ifNull: ["$u.gender", "unspecified"] },
            age: { $ifNull: ["$u.age", null] },
          },
        },
      ];

      const docs = await Appointment.aggregate(pipeline);

      const genderCounts = { male: 0, female: 0, other: 0, unspecified: 0 };
      for (const d of docs) {
        const g = String(d.gender || "unspecified").toLowerCase();
        if (g === "male") genderCounts.male++;
        else if (g === "female") genderCounts.female++;
        else if (g === "other") genderCounts.other++;
        else genderCounts.unspecified++;
      }

      const bucketDefs = [
        { label: "0–12", min: 0, max: 12 },
        { label: "13–17", min: 13, max: 17 },
        { label: "18–29", min: 18, max: 29 },
        { label: "30–44", min: 30, max: 44 },
        { label: "45–64", min: 45, max: 64 },
        { label: "65+", min: 65, max: 200 },
      ];
      const ageBuckets = bucketDefs.map((b) => ({ label: b.label, count: 0 }));
      for (const d of docs) {
        const age = Number(d.age);
        if (!Number.isFinite(age) || age < 0) continue;
        const idx = bucketDefs.findIndex((b) => age >= b.min && age <= b.max);
        if (idx >= 0) ageBuckets[idx].count++;
      }

      res.json({ gender: genderCounts, ageBuckets });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/coverage",
  // --- FIX 4: Secure the route ---
  requireAuth,
  requireRole(User.ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const totalRegistered = await User.countDocuments({
        $or: [{ role: "PATIENT" }, { role: { $exists: false } }],
      });

      const distinctPatients = await Appointment.aggregate([
        {
          $match: { status: { $in: COMPLETED_STATUSES } },
        },
        // --- FIX 5: Use the correct "patient" field from your real model ---
        {
          $project: {
            patient: "$patient", // Use the correct field name
          },
        },
        { $match: { patient: { $ne: null } } },
        {
          $group: { _id: "$patient" },
        },
        { $count: "n" },
      ]);

      const vaccinated = Number(distinctPatients?.[0]?.n || 0);
      const percent =
        totalRegistered > 0 ? Math.round((vaccinated / totalRegistered) * 100) : 0;

      res.json({ coverage: { totalRegistered, vaccinated, percent } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;