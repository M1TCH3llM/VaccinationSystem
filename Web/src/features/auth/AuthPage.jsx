// web/src/features/auth/AuthPage.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setLoading, setError, setCredentials, logout, selectAuth } from "../../store";
import * as api from "../../api/auth";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { user, loading, error } = useSelector(selectAuth);

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "PATIENT", // ADMIN | HOSPITAL | PATIENT
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    dispatch(setLoading(true));
    try {
      let resp;
      if (mode === "login") {
        resp = await api.login({ email: form.email.trim(), password: form.password });
      } else {
        resp = await api.register({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim() || undefined,
          role: form.role,
        });
      }
      dispatch(setCredentials(resp));
      nav("/"); // go home after auth
    } catch (err) {
      dispatch(setError(err.message || "Authentication failed"));
    }
  }

  // Demo credentials component... remove later
  function DemoCreds() {
    return (
      <div className="small text-secondary">
        <div className="fw-semibold">Demo accounts (from seed):</div>
        <div>Admin — <code>admin@vax.local</code> / <code>Admin@123</code></div>
        <div>Patient — <code>patient@vax.local</code> / <code>Patient@123</code></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="container py-4" style={{ maxWidth: 520 }}>
        <h1 className="h4 mb-3">You’re signed in</h1>
        <div className="card bg-dark border">
          <div className="card-body">
            <div className="mb-2"><span className="text-secondary">Email:</span> {user.email}</div>
            <div className="mb-2"><span className="text-secondary">Role:</span> {user.role}</div>
            <div className="mb-2"><span className="text-secondary">Approved:</span> {String(user.isApproved ?? user.approved ?? false)}</div>
            <button
              className="btn btn-outline-light mt-2"
              onClick={() => dispatch(logout())}
              disabled={loading}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 520 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">{mode === "login" ? "Sign in" : "Create account"}</h1>
        <div className="btn-group">
          <button
            className={`btn btn-sm ${mode === "login" ? "btn-light" : "btn-outline-light"}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`btn btn-sm ${mode === "register" ? "btn-light" : "btn-outline-light"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card bg-dark border">
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}

          {mode === "register" && (
            <div className="mb-3">
              <label className="form-label">Name (optional)</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={form.name}
                onChange={onChange}
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              required
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              required
              type="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={onChange}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "register" && (
            <div className="mb-3">
              <label className="form-label">Role</label>
              <select
                name="role"
                className="form-select"
                value={form.role}
                onChange={onChange}
              >
                <option value="PATIENT">Patient</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div className="form-text text-secondary">
                Most users should choose <strong>Patient</strong>.
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-light" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <div className="mt-3">
            <DemoCreds />
          </div>
        </div>
      </form>
    </div>
  );
}
