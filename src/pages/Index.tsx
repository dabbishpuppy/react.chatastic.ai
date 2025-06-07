
import React from "react";
import { Navigate } from "react-router-dom";

const Index = () => {
  // Redirect to dashboard page
  return <Navigate to="/dashboard" replace />;
};

export default Index;
