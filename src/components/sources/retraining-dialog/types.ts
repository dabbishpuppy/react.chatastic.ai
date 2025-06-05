
export interface RetrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRetraining: boolean;
  progress: any;
  retrainingNeeded: any;
  onStartRetraining: () => void;
  trainingProgress?: any;
}

export interface DialogStatus {
  status: 'training' | 'failed' | 'completed' | 'needs_training' | 'up_to_date';
  progress: number;
}

export interface SourceDetail {
  id: string;
  title: string;
  type: string;
  reason: string;
  status: string;
}
