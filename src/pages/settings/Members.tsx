
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useTeamMembers, TeamMember } from "@/hooks/useTeamMembers";
import ManageTeamAccessDialog from "@/components/settings/ManageTeamAccessDialog";
import MembersTable from "@/components/settings/MembersTable";
import MembersTableSkeleton from "@/components/settings/MembersTableSkeleton";
import InviteMemberDialog from "@/components/settings/InviteMemberDialog";
import RemoveMemberDialog from "@/components/settings/RemoveMemberDialog";
import TeamInvitations from "@/components/settings/TeamInvitations";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useTeamsData } from "@/hooks/useTeamsData";

const MembersSettings: React.FC = () => {
  const { members, loading, refetch } = useTeamMembers();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const { selectedTeam } = useTeamsData();
  const { permissions } = useRolePermissions(selectedTeam?.id || null);

  const handleManageTeams = (member: TeamMember) => {
    setSelectedMember(member);
    setIsManageTeamDialogOpen(true);
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsRemoveConfirmOpen(true);
  };

  const handleCloseManageTeam = () => {
    setIsManageTeamDialogOpen(false);
    setSelectedMember(null);
  };

  const handleCloseRemoveDialog = () => {
    setIsRemoveConfirmOpen(false);
    setSelectedMember(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Members</h2>
            {permissions.canInviteMembers && (
              <Button disabled>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite members
              </Button>
            )}
          </div>
          <MembersTableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TeamInvitations disableLoadingWhenMainLoading={false} />
      
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">
              Members <span className="text-sm text-muted-foreground font-normal">{members.length}/{members.length}</span>
            </h2>
          </div>
          {permissions.canInviteMembers && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite members
            </Button>
          )}
        </div>

        <MembersTable
          members={members}
          onManageTeams={handleManageTeams}
          onRemoveMember={handleRemoveMember}
          selectedTeamId={selectedTeam?.id}
        />

        {permissions.canInviteMembers && (
          <InviteMemberDialog
            isOpen={isInviteDialogOpen}
            onClose={() => setIsInviteDialogOpen(false)}
          />
        )}

        <RemoveMemberDialog
          isOpen={isRemoveConfirmOpen}
          onClose={handleCloseRemoveDialog}
          member={selectedMember}
          onSuccess={refetch}
        />

        {selectedMember && (
          <ManageTeamAccessDialog
            isOpen={isManageTeamDialogOpen}
            onClose={handleCloseManageTeam}
            member={selectedMember}
            onSuccess={refetch}
          />
        )}
      </div>
    </div>
  );
};

export default MembersSettings;
