
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  sourceTitle: string;
  isDeleting?: boolean;
  isWebsiteSource?: boolean;
}

const DeleteSourceDialog: React.FC<DeleteSourceDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  sourceTitle,
  isDeleting = false,
  isWebsiteSource = false
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Source</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete "{sourceTitle}"?</p>
            {isWebsiteSource && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-2">
                <p className="text-sm text-orange-800 font-medium">
                  ⚠️ This will permanently delete:
                </p>
                <ul className="text-sm text-orange-700 mt-1 list-disc list-inside space-y-1">
                  <li>The main source and all child pages</li>
                  <li>All generated content chunks</li>
                  <li>All embeddings and training data</li>
                  <li>All crawl history and jobs</li>
                </ul>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-2">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteSourceDialog;
