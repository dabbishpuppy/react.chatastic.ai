
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
import { Team } from "@/types/dashboard";

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
  const { toast } = useToast();
  
  const handleDelete = () => {
    if (confirmName === team.name) {
      onTeamDeleted(team.id);
      onOpenChange(false);
      setConfirmName("");
    } else {
      toast({
        title: "Error",
        description: "Team names do not match",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setConfirmName("");
    onOpenChange(false);
  };

  const isDeleteDisabled = confirmName !== team.name;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500">
            Delete {team.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete your team?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <label className="text-sm font-medium block mb-2">
            Type {team.name} to confirm
          </label>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={`Type "${team.name}" to confirm`}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleteDisabled}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTeamDialog;
