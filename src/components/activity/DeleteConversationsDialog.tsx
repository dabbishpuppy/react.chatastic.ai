
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface DeleteConversationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  onConversationsDeleted: () => void;
}

const DeleteConversationsDialog = ({
  open,
  onOpenChange,
  agentName,
  onConversationsDeleted
}: DeleteConversationsDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirmText !== "delete all conversations") return;
    
    setIsSubmitting(true);
    
    // Call the delete function passed from parent
    onConversationsDeleted();
    setIsSubmitting(false);
    onOpenChange(false);
    setConfirmText("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500">
            Delete all conversations?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all
            conversations for <span className="font-medium">{agentName}</span> 
            and remove their data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <div className="text-sm font-medium">
            Type <span className="font-semibold">delete all conversations</span> to confirm
          </div>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type 'delete all conversations' to confirm"
            className="w-full"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={confirmText !== "delete all conversations" || isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete All Conversations"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConversationsDialog;
