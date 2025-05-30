
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useTeamMembers, TeamMember } from "@/hooks/useTeamMembers";
import ManageTeamAccessDialog from "@/components/settings/ManageTeamAccessDialog";
import MembersTable from "@/components/settings/MembersTable";
import InviteMemberDialog from "@/components/settings/InviteMemberDialog";
import RemoveMemberDialog from "@/components/settings/RemoveMemberDialog";

const MembersSettings: React.FC = () => {
  const { members, loading, refetch } = useTeamMembers();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

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
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Members</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">
            Members <span className="text-sm text-muted-foreground font-normal">{members.length}/{members.length}</span>
          </h2>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite members
        </Button>
      </div>

      <MembersTable
        members={members}
        onManageTeams={handleManageTeams}
        onRemoveMember={handleRemoveMember}
      />

      <InviteMemberDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
      />

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
  );
};

export default MembersSettings;
