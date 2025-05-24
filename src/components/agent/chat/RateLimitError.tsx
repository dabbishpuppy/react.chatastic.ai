
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface RateLimitErrorProps {
  message: string;
  timeUntilReset?: number | null;
  onCountdownFinished?: () => void;
}

const RateLimitError: React.FC<RateLimitErrorProps> = ({ 
  message, 
  timeUntilReset, 
  onCountdownFinished 
}) => {
  const [countdown, setCountdown] = useState<number | null>(timeUntilReset || null);

  useEffect(() => {
    if (timeUntilReset && timeUntilReset > 0) {
      setCountdown(timeUntilReset);
    }
  }, [timeUntilReset]);

  useEffect(() => {
    if (!countdown || countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev && prev > 1) {
          return prev - 1;
        } else {
          // Countdown finished
          if (onCountdownFinished) {
            onCountdownFinished();
          }
          return null;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, onCountdownFinished]);

  // Don't render if countdown is finished
  if (!countdown || countdown <= 0) {
    return null;
  }

  return (
    <div className="p-3 border-t border-b bg-red-50">
      <div className="flex items-start">
        <AlertCircle className="text-red-600 h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <p className="text-red-700 text-sm font-medium">{message}</p>
          <p className="text-red-600 text-xs mt-1">
            Try again in {countdown} seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default RateLimitError;
