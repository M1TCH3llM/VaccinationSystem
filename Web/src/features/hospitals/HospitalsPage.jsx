// web/src/features/hospitals/HospitalsPage.jsx
import React, { useEffect, useState } from "react";
import * as api from "../../api/hospitals";

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    api.list()
      .then((data) => {
        if (!alive) return;
        setHospitals(Array.isArray(data?.hospitals) ? data.hospitals : []);
      })
      .catch((e) => alive && setErr(e.message || "Failed to load hospitals"))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, []);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">Hospitals</h1>
        <span className="text-secondary small">
          {loading ? "Loading…" : `${hospitals.length} found`}
        </span>
      </div>

      {err && (
        <div className="alert alert-danger">{err}</div>
      )}

      {loading && (
        <div className="row g-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="col-md-6 col-lg-4" key={i}>
              <div className="card bg-dark border">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <span className="placeholder col-6"></span>
                    <p className="placeholder col-8 mt-3"></p>
                    <p className="placeholder col-5"></p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !err && hospitals.length === 0 && (
        <div className="alert alert-secondary">No hospitals available.</div>
      )}

      {!loading && !err && hospitals.length > 0 && (
        <div className="row g-3">
          {hospitals.map((h) => (
            <div className="col-md-6 col-lg-4" key={h._id || h.id}>
              <div className="card bg-dark border h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-start justify-content-between">
                    <h2 className="h5 m-0">{h.name}</h2>
                    <span className={`badge ${h.type === "GOVT" ? "text-bg-success" : "text-bg-primary"}`}>
                      {h.type}
                    </span>
                  </div>
                  <div className="text-secondary small mt-2">
                    {h.address || "—"}
                  </div>

                  <div className="mt-3">
                    <div className="small text-secondary">Charges</div>
                    <div className="fw-semibold">
                      {typeof h.charges === "number" ? `$${h.charges.toFixed(2)}` : "—"}
                    </div>
                  </div>

                  <div className="mt-auto pt-3 d-flex gap-2">
                    {/* Detail route will be wired later */}
                    <button className="btn btn-outline-light btn-sm" disabled>
                      View details
                    </button>
                    {h.isApproved ? (
                      <span className="badge text-bg-secondary align-self-center">Approved</span>
                    ) : (
                      <span className="badge text-bg-warning align-self-center">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
