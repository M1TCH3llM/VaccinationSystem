// web/src/features/admin/ManagePendingPatients.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectToken } from "../../store/index"; 

// (Helper functions getJsonAuth and patchJsonAuth are fine, no change)
async function getJsonAuth(path, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(path, { headers });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return res.json();
}

//  The other helper function
async function patchJsonAuth(path, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(path, { method: "PATCH", headers });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return res.json();
}

//  React Component 
export default function ManagePendingPatients() {
  //  1. Using React Hooks for State 
  const [patients, setPatients] = useState([]); // List of pending patients
  const [loading, setLoading] = useState(true); // Loading state set to true initially
  const [error, setError] = useState(null); // Error state
  
  //  2. Using React Hook to get data from Redux 
  const token = useSelector(selectToken); // Get the auth token from Redux store

  //  3. Using React Hook to fetch data on load 
  useEffect(() => {
    if (token) {
      fetchPatients(); // Fetch pending patients if token is available
    } else {
      setLoading(false); // Stop loading if no token
      setError("Not authorized"); // Set error if not authorized
    }
  }, [token]); // Re-run if the token changes

  // Function to fetch the pending patients
  const fetchPatients = async () => {
    try {
      setLoading(true); // Start loading
      setError(null); // clears previous errors
      const data = await getJsonAuth("/api/admin/pending-patients", token); // call backend route
      setPatients(data); // Set the fetched patients to state in step 1
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  // Function to handle the "Approve" button click
  const handleApprove = async (patientId) => {
    try {
      // This is the other backend route we built!
      await patchJsonAuth(
        `/api/admin/approve-patient/${patientId}`,
        token
      );
      
      // Success! Remove the approved patient from the list for a snappy UI
      setPatients((currentPatients) =>
        currentPatients.filter((p) => p._id !== patientId)
      );
    } catch (err) {
      console.error("Failed to approve patient:", err);
      // You can use a more formal error state here if you like
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="p-3">Loading pending patients...</div>; // Loading state
  if (error) return <div className="alert alert-danger">{error}</div>; // Error state

  // If both loading and error are false, show the main UI
  return (
    <div className="card bg-dark border mt-4">
      <div className="card-header d-flex justify-content-between">
        <h5 className="mb-0">Patient Approval Queue</h5>
        <button className="btn btn-sm btn-outline-light" onClick={fetchPatients} disabled={loading}>
          {loading ? "..." : "Reload"}
        </button>
      </div>
      <div className="card-body">
        {patients.length === 0 ? (
          <p className="text-secondary">No pending patient approvals found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name || "N/A"}</td>
                    <td>{p.email}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApprove(p._id)}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}