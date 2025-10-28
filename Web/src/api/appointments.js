// web/src/api/appointments.js

const API_BASE = "/api/appointments"

async function jfetch(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// update vaccine Dose number if already vaccinated
export function updateDose(appointmentId, doseNumber, token) {

  return jfetch(`/${appointmentId}/dose`, { method: "PUT", body: { doseNumber }, token });
}

// List available slots for a hospital + date
// /api/appointments/availability?hospitalId=...&date=YYYY-MM-DD
export function getAvailability(hospitalId, date) {
  return jfetch(`/availability?hospitalId=${hospitalId}&date=${date}`);
}

// Book a new appointment
// body: { hospitalId, vaccineId, startAt }
export function book(payload, token) {
  return jfetch("", { method: "POST", body: payload, token });
}

// Get current user’s appointments
export function myAppointments(token) {
  return jfetch("/my", { token });
}
