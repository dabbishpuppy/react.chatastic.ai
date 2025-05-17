
import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  isActive: boolean;
  agents: any[];
  metrics?: any;
}

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  onTeamDeleted: (teamId: string) => void;
}

const DeleteTeamDialog: React.FC<DeleteTeamDialogProps> = ({
  open,
  onOpenChange,
  team,
  onTeamDeleted,
}) => {
  const [confirmName, setConfirmName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleDelete = () => {
    if (confirmName !== team.name) {
      toast({
        title: "Error",
        description: "Team names do not match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Add a small delay for smooth transition
    setTimeout(() => {
      onTeamDeleted(team.id);
      toast({
        title: "Team deleted",
        description: `"${team.name}" has been deleted`,
        variant: "destructive",
      });
      setConfirmName("");
      onOpenChange(false);
      setIsSubmitting(false);
    }, 500);
  };

  const handleCancel = () => {
    setConfirmName("");
    onOpenChange(false);
  };

  const isDeleteDisabled = confirmName !== team.name || isSubmitting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Delete Team {team.name}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete your team?
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-2">
          <label className="text-sm font-medium block">Team Name</label>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={team.name}
          />
          <p className="text-sm text-gray-500">
            Please type your team name to confirm
          </p>
        </div>

        <AlertDialogFooter>
          <div className="flex justify-between sm:justify-end gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleteDisabled}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTeamDialog;
