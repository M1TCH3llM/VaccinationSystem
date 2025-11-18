// web/src/index.jsx
import React, {Suspense, lazy} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import store, { selectUser } from "./store";

import ProtectedRoute from "../src/components/ProtectedRouts";

// --- Lazy loaded pages (This is all correct) ---
const AuthPage = lazy(() => import("./features/auth/AuthPage"));
const HospitalsPage = lazy(() => import("./features/hospitals/HospitalsPage"));
const VaccinesPage = lazy(() => import("./features/vaccines/VaccinesPage"));
const AppointmentsPage = lazy(() => import("./features/appointments/AppointmentPage"));
const PaymentsPage = lazy(() => import("./features/payments/PaymentsPage"));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage"));
const AdminPage = lazy(() => import("./features/admin/AdminPage"));

const PageLoader = () => (
  <div className="container py-4">
    <p className="text-secondary">Loading page...</p>
  </div>
);


function Home() {
  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">Vaccination System</h1>
      <p className="text-secondary">
        Welcome.
      </p>
      <div className="alert alert-secondary">
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="container py-4">
      <h1 className="h4">404 — Not Found</h1>
      <p className="text-secondary">The page you’re looking for does not exist.</p>
    </div>
  );
}

function App() {
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom">
        <div className="container">
          <Link className="navbar-brand" to="/">Vax</Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarsMain"
            aria-controls="navbarsMain"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarsMain">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/auth">Auth</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/hospitals">Hospitals</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/vaccines">Vaccines</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/appointments">Appointments</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/payments">Payments</Link></li>
              
              <AdminNavLinks />
            </ul>
          </div>
        </div>
      </nav>

<Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/hospitals" element={<HospitalsPage />} />
        <Route path="/vaccines" element={<VaccinesPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        
        {/* --- 3. FIX: Removed the duplicate public /reports route --- */}
        
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
        
        <Route
          path="/reports"
          element={
            <ProtectedRoute role="ADMIN">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>

      <footer className="mt-auto py-3 border-top">
        <div className="container text-secondary small">
          © {new Date().getFullYear()} Vaccination System
        </div>
      </footer>
    </>
  );
}

function AdminNavLinks() {
  const user = useSelector(selectUser);

  if (user?.role !== "ADMIN") {
    return null;
  }

  // Show these links only to Admins
  return (
    <>
      <li className="nav-item"><Link className="nav-link" to="/reports">Reports</Link></li>
      <li className="nav-item"><Link className="nav-link" to="/admin">Admin</Link></li>
    </>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);