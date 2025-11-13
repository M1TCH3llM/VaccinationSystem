// web/src/features/admin/AdminPage.jsx

import React from "react";
import ManageAppointments from "./ManageAppt"; 
import ManagePendingPatients from "./ManagePendingPatients";

export default function AdminPage() {
  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">Admin Dashboard</h1>
      
      <ManagePendingPatients />

      <ManageAppointments />
      
    </div>
  );
}