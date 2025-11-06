// server/model/Vaccine.js
const { Schema, model } = require("mongoose");

const VaccineSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    type: { type: String, required: true, trim: true },          
    price: { type: Number, required: true, min: 0 },
    sideEffects: [{ type: String, trim: true }],                  
    origin: { type: String, trim: true },                         
    dosesRequired: { type: Number, required: true, min: 1 },      
    strainsCovered: [{ type: String, trim: true }],               
    otherInfo: { type: String, trim: true },                  
  },
  { timestamps: true }
);

const Vaccine = model("Vaccine", VaccineSchema);
module.exports = Vaccine;
