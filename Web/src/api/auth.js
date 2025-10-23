// web/src/api/auth.js

const API_BASE = "/api/auth";

async function jfetch(path, { method = "GET", token, body } = {}) {
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

export function register(payload) {
  // payload: { email, password, name?, role? }
  return jfetch("/register", { method: "POST", body: payload });
}

export function login(payload) {
  // payload: { email, password }
  return jfetch("/login", { method: "POST", body: payload });
}

export function me(token) {
  return jfetch("/me", { token });
}
