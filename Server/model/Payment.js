const { Schema, model, Types } = require("mongoose");

const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
};

const PaymentSchema = new Schema(
  {
    // Link to the user who is paying
    patient: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Link to the appointment being paid for
    appointment: {
      type: Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    // Link to the hospital (for records)
    hospital: {
      type: Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    // A unique code to find this payment later
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // The amount that was paid
    amount: {
      type: Number,
      required: true,
    },
    // The status of this payment
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    // The mock QR code payload
    qrPayload: {
      type: String,
    },
    // Snapshot of names for payment history
    hospitalName: String,
    vaccineName: String,

    // Timestamps for when the payment was confirmed
    paidAt: { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.statics.STATUS = PAYMENT_STATUS;

const Payment = model("Payment", PaymentSchema);
module.exports = Payment;