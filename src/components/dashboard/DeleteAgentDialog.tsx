
import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
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

  const handleDelete = () => {
    if (confirmName !== agent.name) {
      toast({
        title: "Error",
        description: "Agent names do not match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // In a real application, you would call an API here
    // For now we'll just simulate a delay and update locally
    setTimeout(() => {
      onAgentDeleted(agent.id);
      toast({
        title: "Agent deleted",
        description: `${agent.name} has been deleted successfully.`,
      });
      
      setIsSubmitting(false);
      setConfirmName("");
      onOpenChange(false);
    }, 500);
  };

  const handleClose = () => {
    setConfirmName("");
    onOpenChange(false);
  };

  const isDeleteDisabled = confirmName !== agent.name || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center sm:items-start">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Delete Agent {agent.name}?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete your agent?
            <br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Name</label>
            <Input 
              placeholder={agent.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
            <p className="text-sm text-gray-500">Please type your agent name to confirm</p>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleteDisabled}
            className="bg-red-500 hover:bg-red-600"
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAgentDialog;
