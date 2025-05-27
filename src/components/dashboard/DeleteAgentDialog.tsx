
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

interface Agent {
  id: string;
  name: string;
  image: string;
  color: string;
  status?: string;
  team_id?: string;
}

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onAgentDeleted: (agentId: string) => void;
}

const DeleteAgentDialog = ({
  open,
  onOpenChange,
  agent,
  onAgentDeleted
}: DeleteAgentDialogProps) => {
  const [confirmName, setConfirmName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmName !== agent.name) return;
    
    setIsSubmitting(true);
    
    try {
      await onAgentDeleted(agent.id);
      onOpenChange(false);
      setConfirmName("");
    } catch (error) {
      // Error handling is done in the onAgentDeleted function
      console.error('Delete operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500">
            Delete {agent.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            <span className="font-medium"> {agent.name} </span>
            agent and <strong>all related data</strong> including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Conversations and messages</li>
              <li>Lead data</li>
              <li>Chat interface settings</li>
              <li>Notification settings</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <div className="text-sm font-medium">
            Type <span className="font-semibold">{agent.name}</span> to confirm
          </div>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={`Type "${agent.name}" to confirm`}
            className="w-full"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmName("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={confirmName !== agent.name || isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete Agent"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAgentDialog;
