// web/src/features/vaccines/VaccinesPage.jsx
import React, { useEffect, useState } from "react";
import * as api from "../../api/vaccines";

export default function VaccinesPage() {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    api.list()
      .then((data) => {
        if (!alive) return;
        setVaccines(Array.isArray(data?.vaccines) ? data.vaccines : []);
      })
      .catch((e) => alive && setErr(e.message || "Failed to load vaccines"))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, []);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">Vaccines</h1>
        <span className="text-secondary small">
          {loading ? "Loading…" : `${vaccines.length} found`}
        </span>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading && (
        <div className="row g-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="col-md-6 col-lg-4" key={i}>
              <div className="card bg-dark border">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <span className="placeholder col-7"></span>
                    <p className="placeholder col-6 mt-3"></p>
                    <p className="placeholder col-5"></p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !err && vaccines.length === 0 && (
        <div className="alert alert-secondary">No vaccines available.</div>
      )}

      {!loading && !err && vaccines.length > 0 && (
        <div className="row g-3">
          {vaccines.map((v) => (
            <div className="col-md-6 col-lg-4" key={v._id || v.id}>
              <div className="card bg-dark border h-100">
                <div className="card-body d-flex flex-column">
                  <h2 className="h5 m-0">{v.name}</h2>
                  <div className="text-secondary small mt-1">{v.type}</div>

                  <div className="mt-3 small">
                    <div className="text-secondary">Price</div>
                    <div className="fw-semibold">
                      {typeof v.price === "number" ? `$${v.price.toFixed(2)}` : "—"}
                    </div>
                  </div>

                  <div className="mt-2 small">
                    <div className="text-secondary">Doses Required</div>
                    <div className="fw-semibold">{v.dosesRequired ?? "—"}</div>
                  </div>

                  <div className="mt-2 small text-secondary">
                    {Array.isArray(v.strainsCovered) && v.strainsCovered.length > 0
                      ? `Strains: ${v.strainsCovered.join(", ")}`
                      : "Strains: —"}
                  </div>

                  <div className="mt-auto pt-3 d-flex gap-2">
                    <button className="btn btn-outline-light btn-sm" disabled>
                      View details
                    </button>
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
