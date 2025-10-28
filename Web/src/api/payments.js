// web/src/api/payments.js
const API_BASE = "/api/payments";

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

// Start a payment
export function initiate(appointmentId, token) {
  return jfetch("/initiate", { method: "POST", body: { appointmentId }, token });
}

// Confirm a payment by reference
export function confirm(reference, token) {
  return jfetch("/confirm", { method: "POST", body: { reference }, token });
}

// List my payments
export function my(token) {
  return jfetch("/my", { token });
}
