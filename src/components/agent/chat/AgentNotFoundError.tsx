
import React from "react";
import { AlertCircle } from "lucide-react";

const AgentNotFoundError: React.FC = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center p-4 bg-white">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Agent Not Found</h2>
        <p className="text-gray-600">
          This AI agent no longer exists or has been removed. 
          Please contact the website owner if you believe this is an error.
        </p>
      </div>
    </div>
  );
};

export default AgentNotFoundError;
