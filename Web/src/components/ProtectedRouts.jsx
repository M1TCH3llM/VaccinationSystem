// web/src/components/ProtectedRoute.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { selectUser } from "../store"; // Make sure this path is correct


export default function ProtectedRoute({ children, role }) {
  const user = useSelector(selectUser);

  if (!user || !user.role) {
  
    return <Navigate to="/auth" replace />;
  }

  if (role && user.role !== role) {
   
    return <Navigate to="/" replace />;
  }

  return children;
}