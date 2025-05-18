
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

interface EditAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onAgentEdited: (updatedAgent: Agent) => void;
}

const EditAgentDialog = ({
  open,
  onOpenChange,
  agent,
  onAgentEdited
}: EditAgentDialogProps) => {
  const [name, setName] = useState(agent.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // In a real application, you would call an API here
    // For now we'll just simulate a delay and update locally
    setTimeout(() => {
      const updatedAgent = {
        ...agent,
        name: name.trim()
      };
      
      onAgentEdited(updatedAgent);
      toast({
        title: "Agent updated",
        description: `${agent.name} has been renamed to ${name.trim()}.`,
      });
      
      setIsSubmitting(false);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || isSubmitting || name.trim() === agent.name}
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgentDialog;
