import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectToken } from "../../store";

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

async function patchJsonAuth(path, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(path, { method: "PATCH", headers });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return res.json();
}


// --- The React Component ---
export default function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const token = useSelector(selectToken);

  useEffect(() => {
    if (token) {
      fetchAppointments();
    } else {
      setLoading(false);
      setError("Not authorized");
    }
  }, [token]); 

  // Function to fetch the appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      // --- THE FIX: Call the new route for PAID appointments ---
      const data = await getJsonAuth("/api/admin/appointments/pending-completion", token);
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // This function is still 100% correct
  const handleComplete = async (appointmentId) => {
    try {
      await patchJsonAuth(
        `/api/admin/appointments/${appointmentId}/complete`,
        token
      );
      
      setAppointments((currentApps) =>
        currentApps.filter((app) => app._id !== appointmentId)
      );
    } catch (err) {
      console.error("Failed to complete appointment:", err);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="p-3">Loading appointments...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card bg-dark border">
      <div className="card-header d-flex justify-content-between">
        {/* --- Updated Title for Clarity --- */}
        <h5 className="mb-0">Appointments Pending Completion (Paid)</h5>
        <button className="btn btn-sm btn-outline-light" onClick={fetchAppointments}>
          Reload
        </button>
      </div>
      <div className="card-body">
        {appointments.length === 0 ? (
          // --- Updated Text for Clarity ---
          <p className="text-secondary">No paid appointments awaiting completion.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-striped">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Hospital</th>
                  <th>Vaccine</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app._id}>
                    <td>{app.patient?.name || "Unknown"}</td>
                    <td>{app.hospital?.name || "Unknown"}</td>
                    <td>{app.vaccine?.name || "Unknown"}</td>
                    <td>{new Date(app.startAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleComplete(app._id)}
                      >
                        Mark Completed
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
