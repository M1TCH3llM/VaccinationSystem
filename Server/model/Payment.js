// server/src/models/Payment.js
const { Schema, model, Types } = require("mongoose");
const crypto = require("crypto");

const METHODS = {
  QR: "QR",
};

const STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
};

function makeRef() {
  //  payment reference
  return crypto.randomBytes(6).toString("hex").toUpperCase(); // e.g., "A1B2C3D4E5F6"
}

const PaymentSchema = new Schema(
  {
    appointment: { type: Types.ObjectId, ref: "Appointment", required: true, index: true },
    patient: { type: Types.ObjectId, ref: "User", required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: Object.values(METHODS), default: METHODS.QR },

    // mock QR flow
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.PENDING, index: true },
    confirmedAt: { type: Date },

    // snapshot info
    hospitalName: { type: String, trim: true },
    vaccineName: { type: String, trim: true },
    doseNumber: { type: Number, min: 1 },
  },
  { timestamps: true }
);

// Pre-validate: ensure reference
PaymentSchema.pre("validate", function (next) {
  if (!this.reference) this.reference = makeRef();
  next();
});

const Payment = model("Payment", PaymentSchema);
Payment.METHODS = METHODS;
Payment.STATUS = STATUS;

module.exports = Payment;
