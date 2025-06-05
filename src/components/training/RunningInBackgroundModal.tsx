
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface RunningInBackgroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progressPercentage: number;
  pagesProcessed: number;
  totalPages: number;
}

export const RunningInBackgroundModal: React.FC<RunningInBackgroundModalProps> = ({
  open,
  onOpenChange,
  progressPercentage,
  pagesProcessed,
  totalPages
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Agent Training Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Training in progress...
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>

          <div className="text-sm text-muted-foreground">
            {pagesProcessed} of {totalPages} items processed
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Continue in Background
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
