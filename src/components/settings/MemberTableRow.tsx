
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Settings, UserMinus, Clock, Mail } from "lucide-react";
import { TeamMember } from "@/hooks/useTeamMembers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MemberTableRowProps {
  member: TeamMember;
  onManageTeams: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
  canManage?: boolean;
  canManageTeamMembers?: boolean;
}

interface InvitationDetailsResponse {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    role: string;
    team_name: string;
    inviter_email: string;
  };
  error?: string;
}

const MemberTableRow: React.FC<MemberTableRowProps> = ({
  member,
  onManageTeams,
  onRemoveMember,
  canManage = false,
  canManageTeamMembers = false
}) => {
  const { toast } = useToast();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const handleResendInvitation = async () => {
    if (!member.invitation_id) return;

    try {
      // Get invitation details and resend email
      const { data, error } = await supabase.rpc('get_invitation_details', {
        invitation_id_param: member.invitation_id
      });

      if (error) throw error;

      const response = data as unknown as InvitationDetailsResponse;

      if (response.success) {
        const invitation = response.invitation!;
        
        // Send the invitation email
        const emailResponse = await supabase.functions.invoke('send-invitation-email', {
          body: {
            invitationId: member.invitation_id,
            email: invitation.email,
            teamName: invitation.team_name,
            inviterEmail: invitation.inviter_email,
            role: invitation.role
          }
        });

        if (emailResponse.error) {
          throw new Error('Failed to send email');
        }

        toast({
          title: "Invitation resent",
          description: `Invitation email resent to ${member.email}`,
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error resending invitation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatExpiryDate = (expiresAt?: string) => {
    if (!expiresAt) return '';
    return new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const showActions = canManageTeamMembers && (canManage || member.type === 'invitation');

  return (
    <TableRow key={member.user_id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {member.email}
          {member.type === 'invitation' && (
            <Clock className="h-4 w-4 text-yellow-600" />
          )}
        </div>
      </TableCell>
      <TableCell>
        {member.type === 'invitation' ? 'Invited' : 'Member since'} {member.memberSince}
      </TableCell>
      <TableCell>
        <Badge className={getRoleColor(member.role)}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge className={getStatusColor(member.status)}>
            {member.type === 'invitation' ? 'Pending' : 'Active'}
          </Badge>
          {member.type === 'invitation' && member.expires_at && (
            <span className="text-xs text-gray-500">
              Expires {formatExpiryDate(member.expires_at)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {member.teams.map((team, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {team}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.type === 'invitation' ? (
                <DropdownMenuItem 
                  onClick={handleResendInvitation}
                  className="text-sm"
                  style={{ fontSize: '0.875rem' }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Resend invitation
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => onManageTeams(member)}
                  className="text-sm"
                  style={{ fontSize: '0.875rem' }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Teams
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onRemoveMember(member)}
                className="text-sm text-red-600 hover:text-red-700"
                style={{ fontSize: '0.875rem' }}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                {member.type === 'invitation' ? 'Cancel invitation' : 'Remove member'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
};

export default MemberTableRow;
