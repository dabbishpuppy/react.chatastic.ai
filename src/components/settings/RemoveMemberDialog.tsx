
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
      if (member.type === 'invitation') {
        // Cancel invitation
        const { error } = await supabase
          .from('team_invitations')
          .delete()
          .eq('id', member.invitation_id);

        if (error) throw error;

        toast({
          title: "Invitation cancelled",
          description: `Invitation for ${member.email} has been cancelled.`,
        });
      } else {
        // Remove member
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('user_id', member.user_id);

        if (error) throw error;

        toast({
          title: "Member removed",
          description: `${member.email} has been removed from all teams.`,
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error removing member/invitation:', error);
      toast({
        title: member.type === 'invitation' ? "Error cancelling invitation" : "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTitle = () => {
    return member?.type === 'invitation' ? "Cancel Invitation" : "Remove Member";
  };

  const getDescription = () => {
    if (member?.type === 'invitation') {
      return `Are you sure you want to cancel the invitation for ${member?.email}? This action cannot be undone.`;
    }
    return `Are you sure you want to remove ${member?.email} from all teams? This action cannot be undone.`;
  };

  const getActionText = () => {
    return member?.type === 'invitation' ? "Cancel Invitation" : "Remove";
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmRemoveMember} className="bg-red-600 hover:bg-red-700">
            {getActionText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveMemberDialog;
