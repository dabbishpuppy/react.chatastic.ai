
import React from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DialogFooterProps {
  currentStatus: string;
  retrainingNeeded?: any;
  onOpenChange: (open: boolean) => void;
  onStartRetraining: () => void;
  onContinueInBackground: () => void;
}

export const RetrainingDialogFooter: React.FC<DialogFooterProps> = ({
  currentStatus,
  retrainingNeeded,
  onOpenChange,
  onStartRetraining,
  onContinueInBackground
}) => {
  const isTrainingCompleted = currentStatus === 'completed';
  const isTrainingFailed = currentStatus === 'failed';
  const isTrainingActive = currentStatus === 'training';

  if (isTrainingCompleted) {
    return (
      <DialogFooter className="border-t pt-4">
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogFooter>
    );
  }

  if (isTrainingFailed) {
    return (
      <DialogFooter className="border-t pt-4">
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
          <Button onClick={onStartRetraining} className="flex-1">
            Retry Training
          </Button>
        </div>
      </DialogFooter>
    );
  }

  if (isTrainingActive) {
    return (
      <DialogFooter className="border-t pt-4">
        <Button variant="outline" onClick={onContinueInBackground} className="w-full">
          Continue in Background
        </Button>
      </DialogFooter>
    );
  }

  if (retrainingNeeded?.needed) {
    return (
      <DialogFooter className="border-t pt-4">
        <div className="flex gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onStartRetraining} disabled={isTrainingActive} className="w-full">
            Start Training
          </Button>
        </div>
      </DialogFooter>
    );
  }

  return (
    <DialogFooter className="border-t pt-4">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
        Close
      </Button>
    </DialogFooter>
  );
};
