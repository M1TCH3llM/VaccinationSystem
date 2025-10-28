// server/src/models/Appointment.js
const { Schema, model, Types } = require("mongoose");

// Appointment status constants
const APPOINTMENT_STATUS = {
  SCHEDULED: "SCHEDULED",
  PAID: "PAID",          
  COMPLETED: "COMPLETED", 
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
};

const AppointmentSchema = new Schema(
  {
    patient: { type: Types.ObjectId, ref: "User", required: true, index: true },
    hospital: { type: Types.ObjectId, ref: "Hospital", required: true, index: true },
    vaccine: { type: Types.ObjectId, ref: "Vaccine", required: true, index: true },

    // Slot timing
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    durationMin: { type: Number, default: 30, min: 5, max: 240 },

    // Dose tracking
    doseNumber: { type: Number, required: true, min: 1, default: 1 }, 
    dosesRequired: { type: Number, required: true, min: 1 },         

    // Financial snapshot 
    charges: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.SCHEDULED,
      index: true,
    },

    // Simple audit trail
    notes: [{ at: Date, by: String, message: String }],
  },
  { timestamps: true }
);

// Prevent double booking: one appointment per hospital per exact startAt
AppointmentSchema.index(
  { hospital: 1, startAt: 1 },
  { unique: true, name: "uniq_hospital_slot" }
);

// compound index for patient timeline
AppointmentSchema.index({ patient: 1, startAt: 1 });

// Consistent JSON
AppointmentSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  return obj;
};

const Appointment = model("Appointment", AppointmentSchema);
Appointment.STATUS = APPOINTMENT_STATUS;

module.exports = Appointment;
