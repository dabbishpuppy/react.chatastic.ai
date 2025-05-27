
import React from "react";
import { AlertCircle } from "lucide-react";

const PrivateAgentError: React.FC = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center p-4 bg-white">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">This Agent is Private</h2>
        <p className="text-gray-600">
          The owner of this agent has set it to private mode. 
          It cannot be accessed or embedded on external websites.
        </p>
      </div>
    </div>
  );
};

export default PrivateAgentError;
