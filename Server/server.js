// server/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./src/db");

const app = express();

// Config
const PORT = process.env.PORT || 9000;
const CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
];

// Middleware
app.use(cors({
  origin: CLIENT_ORIGINS,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Simple routes
app.get("/", (_req, res) => {
  res.send("Vaccination System API is running.");
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "vaccination-system-api",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// === Mount feature routes (NEW) ===
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/appointments", require("./src/routes/AptRoutes"));
app.use("/api/payments", require("./src/routes/PayRoutes"));
app.use("/api/hospitals", require("./src/routes/hospitals"));


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// Error handler 
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Start server after DB connects
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Startup failure:", err);
  process.exit(1);
});
