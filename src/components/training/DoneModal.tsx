
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';

interface DoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagesProcessed: number;
  totalPages: number;
}

export const DoneModal: React.FC<DoneModalProps> = ({
  open,
  onOpenChange,
  pagesProcessed,
  totalPages
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Training Complete
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="text-sm text-gray-600 mb-4">
              Your AI agent has been successfully trained and is ready to use.
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>100%</span>
              </div>
              <Progress value={100} className="w-full" />
            </div>

            <div className="text-sm text-muted-foreground mt-2">
              {pagesProcessed} of {totalPages} items processed
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
