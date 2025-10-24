// web/src/api/hospitals.js

const API_BASE = "/api/hospitals";

// JSON fetch helper
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

// GET /api/hospitals 
export function list() {
  return jfetch("");
}

// GET /api/hospitals/:id 
export function getById(id) {
  return jfetch(`/${id}`);
}
