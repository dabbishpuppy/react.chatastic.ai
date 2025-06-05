
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface StartTrainingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTraining: () => void;
  sourceUrl: string;
  pageCount: number;
}

export const StartTrainingModal: React.FC<StartTrainingModalProps> = ({
  open,
  onOpenChange,
  onStartTraining,
  sourceUrl,
  pageCount
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Agent Training Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Training is required for:</p>
            <p className="font-medium mt-1">{sourceUrl}</p>
            <p className="mt-2">{pageCount} sources need to be processed for training.</p>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onStartTraining}
            >
              Start Training
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
