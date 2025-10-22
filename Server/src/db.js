// server/src/db.js
const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

const DEFAULT_URI = "mongodb://127.0.0.1:27017/vax_app";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    const { host, port, name } = mongoose.connection;
    console.log(`MongoDB connected: ${host}:${port}/${name}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

// Optional graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed on app termination");
  process.exit(0);
});

module.exports = { connectDB, mongoose };
