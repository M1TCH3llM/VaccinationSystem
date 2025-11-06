// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../model/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";


exports.requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    
    req.user = decoded; 
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

exports.requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ error: "Forbidden. You do not have permission." });
  }
  next();
};


exports.requireApproved = (req, res, next) => {
  if (!req.user || !req.user.approved) {
    return res.status(403).json({ error: "Forbidden. Your account is not approved." });
  }
  next();
};