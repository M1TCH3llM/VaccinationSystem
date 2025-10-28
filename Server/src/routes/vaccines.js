// server/src/routes/vaccines.js
const express = require("express");
const Vaccine = require("../../model/Vaccine");

const router = express.Router();

// GET /api/vaccines
router.get("/", async (req, res, next) => {
  try {
    const vaccines = await Vaccine.find({}).sort({ name: 1 }).lean();
    res.json({ vaccines });
  } catch (e) { next(e); }
});

// GET /api/vaccines/:id
router.get("/:id", async (req, res, next) => {
  try {
    const v = await Vaccine.findById(req.params.id).lean();
    if (!v) return res.status(404).json({ error: "vaccine not found" });
    res.json({ vaccine: v });
  } catch (e) { next(e); }
});

module.exports = router;
