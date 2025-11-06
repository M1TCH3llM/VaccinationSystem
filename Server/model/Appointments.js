// server/model/Appointments.js
const { Schema, model, Types } = require("mongoose");

// This is the Mongoose Schema your routes are trying to load.
const AppointmentSchema = new Schema(
  {
    patient: {
      type: Types.ObjectId,
      ref: "User", // Links to your User model
      required: true,
      index: true,
    },
    hospital: {
      type: Types.ObjectId,
      ref: "Hospital", // You'll need a Hospital model
      required: true,
    },
    vaccine: {
      type: Types.ObjectId,
      ref: "Vaccine", // You'll need a Vaccine model
      required: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    durationMin: {
      type: Number,
      default: 30,
    },
    doseNumber: {
      type: Number,
      required: true,
    },
    dosesRequired: {
      type: Number,
      required: true,
    },
    charges: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "PAID", "COMPLETED", "CANCELLED_PATIENT", "CANCELLED_ADMIN"],
      default: "SCHEDULED",
    },
    notes: [
      {
        at: { type: Date, default: Date.now },
        by: { type: String, enum: ["system", "patient", "admin"], default: "system" },
        message: String,
      },
    ],
  },
  { timestamps: true }
);

// This is a unique index to prevent double-booking the same slot
AppointmentSchema.index({ hospital: 1, startAt: 1 }, { unique: true });

const Appointment = model("Appointment", AppointmentSchema);
module.exports = Appointment;