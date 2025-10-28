// web/src/features/payments/PaymentsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectAuth } from "../../store";
import * as appts from "../../api/appointments";
import * as pay from "../../api/payments";

export default function PaymentsPage() {
  const { token } = useSelector(selectAuth);

  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // reference -> qrPayload
  const [qr, setQr] = useState({}); 

  const needsPayment = useMemo(
    () => appointments.filter(a => a.status === "SCHEDULED"),
    [appointments]
  );

  async function refreshAll() {
    if (!token) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const [a, p] = await Promise.all([appts.myAppointments(token), pay.my(token)]);
      setAppointments(Array.isArray(a?.appointments) ? a.appointments : []);
      setPayments(Array.isArray(p?.payments) ? p.payments : []);
    } catch (e) {
      setLoadErr(e.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  async function onInitiate(appointmentId) {
    if (!token) return setMsg("Please sign in");
    setBusy(true);
    setMsg(null);
    try {
      const { payment, qrPayload } = await pay.initiate(appointmentId, token);
      setQr(q => ({ ...q, [appointmentId]: { reference: payment.reference, payload: qrPayload, amount: payment.amount } }));
      setMsg(`QR generated (ref ${payment.reference}). Use Confirm to finalize.`);
    } catch (e) {
      setMsg(e.message || "Failed to initiate payment");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(appointmentId) {
    const entry = qr[appointmentId];
    if (!entry?.reference) {
      setMsg("Initiate first to get a reference.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { payment, appointmentStatus } = await pay.confirm(entry.reference, token);
      setMsg(`Payment ${payment.status}. Appointment is now ${appointmentStatus}.`);
      // refresh lists
      await refreshAll();
    } catch (e) {
      setMsg(e.message || "Confirmation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (token) refreshAll(); }, [token]);

  if (!token) {
    return (
      <div className="container py-4">
        <h1 className="h4">Payments</h1>
        <div className="alert alert-secondary mt-3">
          Sign in on the <strong>Auth</strong> page to view and pay for appointments.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between">
        <h1 className="h4 m-0">Payments</h1>
        <button className="btn btn-outline-light btn-sm" onClick={refreshAll} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loadErr && <div className="alert alert-danger mt-3">{loadErr}</div>}
      {msg && <div className="alert alert-secondary mt-3">{msg}</div>}

      {/* Section: Appointments needing payment */}
      <div className="card bg-dark border mt-3">
        <div className="card-body">
          <h2 className="h6">Appointments awaiting payment</h2>
          {loading ? (
            <div className="text-secondary small mt-2">Loading…</div>
          ) : needsPayment.length === 0 ? (
            <div className="text-secondary small mt-2">No unpaid appointments.</div>
          ) : (
            <div className="table-responsive mt-2">
              <table className="table table-dark table-striped table-sm align-middle">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Hospital</th>
                    <th>Vaccine</th>
                    <th>Dose</th>
                    <th>Amount</th>
                    <th style={{ width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {needsPayment.map(a => {
                    const q = qr[a._id];
                    return (
                      <tr key={a._id}>
                        <td>{new Date(a.startAt).toLocaleString()}</td>
                        <td>{a.hospital?.name || "—"}</td>
                        <td>{a.vaccine?.name || "—"}</td>
                        <td>{a.doseNumber}/{a.dosesRequired}</td>
                        <td>{typeof a.charges === "number" ? `$${a.charges.toFixed(2)}` : "—"}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-light btn-sm"
                              onClick={() => onInitiate(a._id)}
                              disabled={busy}
                              title="Generate a QR payload (mock)"
                            >
                              Initiate (QR)
                            </button>
                            <button
                              className="btn btn-light btn-sm"
                              onClick={() => onConfirm(a._id)}
                              disabled={busy || !q?.reference}
                              title="Confirm using the generated reference"
                            >
                              Confirm
                            </button>
                          </div>
                          {q?.payload && (
                            <div className="small text-secondary mt-2">
                              <div className="fw-semibold">QR Payload</div>
                              <code className="d-block text-break">{q.payload}</code>
                              <div>Ref: <code>{q.reference}</code></div>
                              <div>Amount: <code>${(q.amount ?? a.charges).toFixed(2)}</code></div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section: My payments history */}
      <div className="card bg-dark border mt-3">
        <div className="card-body">
          <h2 className="h6">My payments</h2>
          {loading ? (
            <div className="text-secondary small mt-2">Loading…</div>
          ) : payments.length === 0 ? (
            <div className="text-secondary small mt-2">No payments yet.</div>
          ) : (
            <div className="table-responsive mt-2">
              <table className="table table-dark table-striped table-sm align-middle">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Ref</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Vaccine</th>
                    <th>Hospital</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p._id}>
                      <td>{new Date(p.createdAt).toLocaleString()}</td>
                      <td><code>{p.reference}</code></td>
                      <td>${Number(p.amount).toFixed(2)}</td>
                      <td><span className="badge text-bg-secondary">{p.status}</span></td>
                      <td>{p.vaccineName || "—"}</td>
                      <td>{p.hospitalName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
