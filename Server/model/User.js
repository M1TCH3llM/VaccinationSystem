// server/src/models/User.js
const { Schema, model } = require("mongoose");
const crypto = require("crypto");

// Role constants
const ROLES = {
  ADMIN: "ADMIN",
  HOSPITAL: "HOSPITAL",
  PATIENT: "PATIENT",
};

// User schema
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PATIENT,
      index: true,
    },

    // Auth (using Node's crypto.scrypt instead of bcrypt to match your deps)
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },

    // Profile (expand later as needed)
    name: { type: String, trim: true },
    age: { type: Number, min: 0, max: 120 },
    profession: { type: String, trim: true },
    contact: { type: String, trim: true }, // phone/email alt
    address: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["male", "female", "other", "unspecified"],
      default: "unspecified",
    },
    diseases: [{ type: String, trim: true }], // pre-existing conditions
    medicalCertificate: { type: String, trim: true }, // URL or file ref

    // Approval flag (for approver workflow)
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ---- Instance methods
UserSchema.methods.setPassword = async function setPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(plain, salt, 64, (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey)
    );
  });
  this.passwordSalt = salt.toString("base64");
  this.passwordHash = key.toString("base64");
};

UserSchema.methods.validatePassword = async function validatePassword(plain) {
  const salt = Buffer.from(this.passwordSalt || "", "base64");
  if (!salt.length || !this.passwordHash) return false;

  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(plain, salt, 64, (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey)
    );
  });
  const stored = Buffer.from(this.passwordHash, "base64");
  if (stored.length !== key.length) return false;
  return crypto.timingSafeEqual(stored, key);
};

// Hide sensitive fields in JSON
UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  delete obj.passwordSalt;
  return obj;
};

const User = model("User", UserSchema);
User.ROLES = ROLES; 

module.exports = User;
