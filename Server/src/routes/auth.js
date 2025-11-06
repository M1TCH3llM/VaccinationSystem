const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../../model/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ALLOWED_GENDER = ["male", "female", "other", "unspecified"];

function signToken(user) {
  const payload = {
    sub: String(user._id),
    role: user.role,
    approved: !!user.isApproved,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post("/register", asyncH(async (req, res) => {
  const { email, password, name, gender, age, ...rest } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail }).lean();
  if (exists) return res.status(409).json({ error: "email already registered" });

  const ageNum = Number(age);
  if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
    return res.status(400).json({ error: "valid age (0–120) is required for patient registration" });
  }

  let safeGender = undefined;
  if (typeof gender === "string") {
    const g = gender.toLowerCase().trim();
    if (!ALLOWED_GENDER.includes(g)) {
      return res.status(400).json({ error: `invalid gender. allowed: ${ALLOWED_GENDER.join(", ")}` });
    }
    safeGender = g;
  }

  const user = new User({
    email: normalizedEmail,
    role: User.ROLES.PATIENT,    
    name: name?.trim() || undefined,
    gender: safeGender,          
    age: ageNum,                 
    ...rest,                   
  });

  await user.setPassword(password);
  await user.save();

  const token = signToken(user);
  res.status(201).json({ token, user: user.toJSON() });
}));

router.post("/login", asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await user.validatePassword(password);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = signToken(user);
  res.json({ token, user: user.toJSON() });
}));

router.get("/me", asyncH(async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing bearer token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(404).json({ error: "user not found" });
    res.json({ user: user.toJSON() });
  } catch (e) {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}));

module.exports = router;
