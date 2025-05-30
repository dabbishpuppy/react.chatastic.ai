
import React from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TeamMember } from "@/hooks/useTeamMembers";

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSuccess: () => void;
}

const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const { toast } = useToast();

  const confirmRemoveMember = async () => {
    if (!member) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', member.user_id);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${member.email} has been removed from all teams.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {member?.email} from all teams? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmRemoveMember} className="bg-red-600 hover:bg-red-700">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveMemberDialog;
