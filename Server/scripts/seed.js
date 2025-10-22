// server/scripts/seed.js
require("dotenv").config();
const { connectDB, mongoose } = require("../src/db");
const User = require("../model/User");
const Hospital = require("../model/Hospital");
const Vaccine = require("../model/Vaccine");

async function seed() {
  await connectDB();

  // Clean existing data (safe for dev)
  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Vaccine.deleteMany({}),
  ]);

  // ===== Users =====
  const admin = new User({
    email: "admin@vax.local",
    role: User.ROLES.ADMIN,
    name: "Admin User",
    isApproved: true,
  });
  await admin.setPassword("Admin@123");

  const patient = new User({
    email: "patient@vax.local",
    role: User.ROLES.PATIENT,
    name: "Test Patient",
    age: 28,
    gender: "unspecified",
    isApproved: true, // allow immediate login/booking during dev
  });
  await patient.setPassword("Patient@123");

  await admin.save();
  await patient.save();

  // ===== Hospitals (5) =====
  const hospitals = await Hospital.insertMany([
    {
      name: "Denver General Hospital",
      address: "123 Civic Center Dr, Denver, CO",
      type: Hospital.TYPES.GOVT,
      charges: 0,
      contact: "(303) 555-0101",
      isApproved: true,
    },
    {
      name: "Rocky Mountain Medical Center",
      address: "456 Alpine Ave, Denver, CO",
      type: Hospital.TYPES.PRIVATE,
      charges: 25,
      contact: "(303) 555-0102",
      isApproved: true,
    },
    {
      name: "Aurora Community Clinic",
      address: "789 Prairie Rd, Aurora, CO",
      type: Hospital.TYPES.GOVT,
      charges: 0,
      contact: "(720) 555-0103",
      isApproved: true,
    },
    {
      name: "Mile High Care",
      address: "1010 Colfax Blvd, Denver, CO",
      type: Hospital.TYPES.PRIVATE,
      charges: 30,
      contact: "(303) 555-0104",
      isApproved: true,
    },
    {
      name: "Front Range Health",
      address: "2222 Foothills Pkwy, Boulder, CO",
      type: Hospital.TYPES.PRIVATE,
      charges: 20,
      contact: "(720) 555-0105",
      isApproved: true,
    },
  ]);

  // ===== Vaccines (5) =====
  const vaccines = await Vaccine.insertMany([
    {
      name: "ImmunoX",
      type: "mRNA",
      price: 19.99,
      sideEffects: ["Sore arm", "Fatigue"],
      origin: "USA",
      dosesRequired: 2,
      strainsCovered: ["XBB.1.5", "BA.5"],
      otherInfo: "Store at 2–8°C",
    },
    {
      name: "ViraShield",
      type: "Viral Vector",
      price: 14.5,
      sideEffects: ["Fever", "Headache"],
      origin: "UK",
      dosesRequired: 1,
      strainsCovered: ["BA.5"],
      otherInfo: "Single dose option",
    },
    {
      name: "ProtecVax",
      type: "Protein Subunit",
      price: 16.0,
      sideEffects: ["Sore arm"],
      origin: "Germany",
      dosesRequired: 2,
      strainsCovered: ["XBB.1.5"],
      otherInfo: "Good stability",
    },
    {
      name: "InactiSure",
      type: "Inactivated",
      price: 12.0,
      sideEffects: ["Mild fever"],
      origin: "India",
      dosesRequired: 2,
      strainsCovered: ["B.1.1.529"],
      otherInfo: "Traditional platform",
    },
    {
      name: "NextGenVax",
      type: "mRNA",
      price: 21.0,
      sideEffects: ["Fatigue", "Chills"],
      origin: "Japan",
      dosesRequired: 2,
      strainsCovered: ["XBB.1.5", "JN.1"],
      otherInfo: "Updated formulation",
    },
  ]);

  console.log("Seed complete.");
  console.log("• Admin login:", { email: "admin@vax.local", password: "Admin@123" });
  console.log("• Patient login:", { email: "patient@vax.local", password: "Patient@123" });
  console.log(`• Hospitals: ${hospitals.length}, Vaccines: ${vaccines.length}`);

  await mongoose.connection.close();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
