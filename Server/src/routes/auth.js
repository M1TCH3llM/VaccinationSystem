// server/src/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../../model/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Small helper to wrap async route handlers
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function signToken(user) {
  const payload = {
    sub: String(user._id),
    role: user.role,
    approved: !!user.isApproved,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}


router.post("/register", asyncH(async (req, res) => {
  const { email, password, role, ...profile } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (exists) return res.status(409).json({ error: "email already registered" });

  const user = new User({
    email: String(email).toLowerCase().trim(),
    role: role && User.ROLES[role.toUpperCase()] ? role.toUpperCase() : undefined,
    ...profile,
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
