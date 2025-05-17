
import React from "react";
import RegistrationForm from "@/components/auth/RegistrationForm";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <RegistrationForm />
      </div>
    </div>
  );
};

export default Register;
