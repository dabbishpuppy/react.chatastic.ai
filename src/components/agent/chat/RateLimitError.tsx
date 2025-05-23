
import React from "react";
import { AlertCircle } from "lucide-react";

interface RateLimitErrorProps {
  message: string;
  timeUntilReset?: number | null;
}

const RateLimitError: React.FC<RateLimitErrorProps> = ({ message, timeUntilReset }) => (
  <div className="p-3 border-t border-b bg-red-50">
    <div className="flex items-start">
      <AlertCircle className="text-red-600 h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
      <div>
        <p className="text-red-700 text-sm font-medium">{message}</p>
        {timeUntilReset && (
          <p className="text-red-600 text-xs mt-1">
            Try again in {timeUntilReset} seconds
          </p>
        )}
      </div>
    </div>
  </div>
);

export default RateLimitError;
