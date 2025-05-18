
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: number;
  name: string;
  image: string;
  color: string;
  status?: string;
  teamId?: string;
  metrics?: {
    conversations: number;
    responseTime: string;
    satisfaction: number;
  };
}

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onAgentDeleted: (agentId: number) => void;
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

  const handleDelete = () => {
    if (confirmName !== agent.name) return;
    
    setIsSubmitting(true);
    
    // In a real application, you would call an API here
    // For now we'll just simulate a delay and update locally
    setTimeout(() => {
      onAgentDeleted(agent.id);
      toast({
        title: "Agent deleted",
        description: `${agent.name} has been deleted.`,
        variant: "destructive"
      });
      
      setIsSubmitting(false);
      onOpenChange(false);
      setConfirmName("");
    }, 500);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            <span className="font-medium"> {agent.name} </span>
            agent and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="confirmName">
            Type <span className="font-semibold">{agent.name}</span> to confirm
          </Label>
          <Input
            id="confirmName"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={`Type "${agent.name}" to confirm`}
            className="w-full"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmName("")} disabled={isSubmitting}>
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
