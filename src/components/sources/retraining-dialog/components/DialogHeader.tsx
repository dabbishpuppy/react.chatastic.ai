
import React from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface DialogHeaderProps {
  currentStatus: string;
  title: string;
  message: string;
  retrainingNeeded?: any;
}

export const RetrainingDialogHeader: React.FC<DialogHeaderProps> = ({
  currentStatus,
  title,
  message,
  retrainingNeeded
}) => {
  const getHeaderIcon = () => {
    if (currentStatus === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (currentStatus === 'failed') {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    if (currentStatus === 'training') {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
    if (retrainingNeeded?.needed) {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {getHeaderIcon()}
        {title}
      </DialogTitle>
      <DialogDescription>
        {message}
      </DialogDescription>
    </DialogHeader>
  );
};
