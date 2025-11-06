// server/model/Hospital.js
const { Schema, model } = require("mongoose");

const HOSPITAL_TYPES = {
  GOVT: "GOVT",
  PRIVATE: "PRIVATE",
};

const HospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(HOSPITAL_TYPES), required: true },
    charges: { type: Number, required: true, min: 0 }, // base service charge per appointment
    contact: { type: String, trim: true }, // optional phone/email
    isApproved: { type: Boolean, default: false }, // for approver workflow
  },
  { timestamps: true }
);

const Hospital = model("Hospital", HospitalSchema);
Hospital.TYPES = HOSPITAL_TYPES;

module.exports = Hospital;
