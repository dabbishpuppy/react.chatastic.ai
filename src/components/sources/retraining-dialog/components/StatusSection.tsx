
import React from "react";
import { CheckCircle } from "lucide-react";

interface StatusSectionProps {
  currentStatus: string;
  retrainingNeeded?: any;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  currentStatus,
  retrainingNeeded
}) => {
  if (currentStatus === 'completed') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">Training Complete!</h3>
        <div className="text-sm text-gray-600">
          Your AI agent has been successfully trained and is ready to use.
        </div>
      </div>
    );
  }

  if (!retrainingNeeded?.needed && currentStatus !== 'training' && currentStatus !== 'failed') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">Everything is ready!</h3>
        <div className="text-sm text-gray-600">
          All your sources have been processed and your AI agent is fully trained.
        </div>
      </div>
    );
  }

  return null;
};
