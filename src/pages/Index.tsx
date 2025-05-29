
import React from "react";
import { Navigate } from "react-router-dom";

const Index = () => {
  // Redirect to register page
  return <Navigate to="/" replace />;
};

export default Index;
