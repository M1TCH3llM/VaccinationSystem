// server/src/routes/hospitals.js
const express = require("express");
const Hospital = require("../../model/Hospital");

const router = express.Router();

// GET /api/hospitals
router.get("/", async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({}).sort({ name: 1 }).lean();
    res.json({ hospitals });
  } catch (e) { next(e); }
});

// GET /api/hospitals/:id
router.get("/:id", async (req, res, next) => {
  try {
    const h = await Hospital.findById(req.params.id).lean();
    if (!h) return res.status(404).json({ error: "hospital not found" });
    res.json({ hospital: h });
  } catch (e) { next(e); }
});

module.exports = router;
