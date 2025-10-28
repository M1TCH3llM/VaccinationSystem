// web/src/features/appointments/AppointmentsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectAuth } from "../../store";
import * as appts from "../../api/appointments";
import * as hospitalsApi from "../../api/hospitals";
import * as vaccinesApi from "../../api/vaccines";

export default function AppointmentsPage() {
  const { token, user } = useSelector(selectAuth);
  const [hospitals, setHospitals] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // form state
  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [form, setForm] = useState({
    hospitalId: "",
    vaccineId: "",
    date: todayIso,
  });

  // availability
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [msg, setMsg] = useState(null);

  // my appointments
  const [my, setMy] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "hospitalId" || name === "date") {
      setSlots([]); // reset when hospital/date changes
    }
  }

  const canFetch = useMemo(
    () => form.hospitalId && form.date,
    [form.hospitalId, form.date]
  );

  async function fetchBasics() {
    setLoading(true);
    setErr(null);
    try {
      const [h, v] = await Promise.all([hospitalsApi.list(), vaccinesApi.list()]);
      setHospitals(Array.isArray(h?.hospitals) ? h.hospitals : []);
      setVaccines(Array.isArray(v?.vaccines) ? v.vaccines : []);
    } catch (e) {
      setErr(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMy() {
    if (!token) return;
    setLoadingMy(true);
    try {
      const data = await appts.myAppointments(token);
      setMy(Array.isArray(data?.appointments) ? data.appointments : []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingMy(false);
    }
  }

  async function fetchAvailability() {
    if (!canFetch) return;
    setLoadingSlots(true);
    setMsg(null);
    try {
      const data = await appts.getAvailability(form.hospitalId, form.date);
      setSlots(Array.isArray(data?.available) ? data.available : []);
    } catch (e) {
      setMsg(e.message || "Failed to load availability");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function book(startAt) {
    if (!token) {
      setMsg("Please sign in first (Auth page).");
      return;
    }
    if (!form.hospitalId || !form.vaccineId) {
      setMsg("Select a hospital and vaccine first.");
      return;
    }
    setBooking(true);
    setMsg(null);
    try {
      const payload = {
        hospitalId: form.hospitalId,
        vaccineId: form.vaccineId,
        startAt, // ISO string from slot
      };
      const created = await appts.book(payload, token);
      setMsg(`Booked! Appointment #${created._id} at ${new Date(created.startAt).toLocaleString()}`);
      // refresh
      await Promise.all([fetchAvailability(), fetchMy()]);
    } catch (e) {
      setMsg(e.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  useEffect(() => { fetchBasics(); }, []);
  useEffect(() => { fetchMy(); }, [token]); // refresh when auth changes

  return (
    <div className="container py-4">
      <h1 className="h4 mb-3">Appointments</h1>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Booking panel */}
      <div className="card bg-dark border mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">Book a new appointment</h2>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Hospital</label>
              <select
                name="hospitalId"
                className="form-select"
                value={form.hospitalId}
                onChange={onChange}
                disabled={loading}
              >
                <option value="">Select hospital…</option>
                {hospitals.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} {h.isApproved ? "" : "(Pending)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Vaccine</label>
              <select
                name="vaccineId"
                className="form-select"
                value={form.vaccineId}
                onChange={onChange}
                disabled={loading}
              >
                <option value="">Select vaccine…</option>
                {vaccines.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} — {v.type} ({v.dosesRequired})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                className="form-control"
                min={todayIso}
                value={form.date}
                onChange={onChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="mt-3 d-flex gap-2">
            <button
              className="btn btn-light"
              onClick={fetchAvailability}
              disabled={!canFetch || loadingSlots}
            >
              {loadingSlots ? "Loading slots…" : "Check availability"}
            </button>
            {msg && <div className="align-self-center text-secondary small">{msg}</div>}
          </div>

          {/* Slots grid */}
          {slots.length > 0 && (
            <div className="mt-3">
              <div className="text-secondary small mb-2">
                {slots.length} slots available (09:00–18:00)
              </div>
              <div className="d-flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startAt}
                    className="btn btn-outline-light btn-sm"
                    disabled={booking}
                    onClick={() => book(s.startAt)}
                    title={`${new Date(s.startAt).toLocaleString()} - ${new Date(s.endAt).toLocaleTimeString()}`}
                  >
                    {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingSlots && slots.length === 0 && canFetch && (
            <div className="mt-3 text-secondary small">No slots found for this day/hospital.</div>
          )}
        </div>
      </div>

      {/* My appointments */}
      <div className="card bg-dark border">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between">
            <h2 className="h6 m-0">My appointments</h2>
            <button
              className="btn btn-outline-light btn-sm"
              onClick={fetchMy}
              disabled={loadingMy || !token}
            >
              {loadingMy ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {!token && (
            <div className="alert alert-secondary mt-3">
              Sign in on the <strong>Auth</strong> page to view and book appointments.
            </div>
          )}

          {token && (
            <>
              {my.length === 0 ? (
                <div className="text-secondary small mt-3">No appointments yet.</div>
              ) : (
                <div className="table-responsive mt-3">
                  <table className="table table-dark table-striped table-sm align-middle">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Hospital</th>
                        <th>Vaccine</th>
                        <th>Dose</th>
                        <th>Status</th>
                        <th>Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {my.map((a) => (
                        <tr key={a._id}>
                          <td>{new Date(a.startAt).toLocaleString()}</td>
                          <td>{a.hospital?.name || "—"}</td>
                          <td>{a.vaccine?.name || "—"}</td>
                          <td>{a.doseNumber} / {a.dosesRequired}</td>
                          <td><span className="badge text-bg-secondary">{a.status}</span></td>
                          <td>{typeof a.charges === "number" ? `$${a.charges.toFixed(2)}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
