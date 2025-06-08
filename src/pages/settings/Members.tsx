
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import MembersTable from "@/components/settings/MembersTable";
import InviteMemberDialog from "@/components/settings/InviteMemberDialog";
import { useTeamMembers, TeamMember } from "@/hooks/useTeamMembers";
import ManageTeamAccessDialog from "@/components/settings/ManageTeamAccessDialog";
import RemoveMemberDialog from "@/components/settings/RemoveMemberDialog";

const MembersSettings = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [manageTeamsDialogOpen, setManageTeamsDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();
  const { members, loading, refetch } = useTeamMembers();

  const handleManageTeams = (member: TeamMember) => {
    setSelectedMember(member);
    setManageTeamsDialogOpen(true);
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setRemoveMemberDialogOpen(true);
  };

  const handleInviteClose = () => {
    setInviteDialogOpen(false);
    refetch(); // Refresh the members list after inviting
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Members</h2>
            <p className="text-gray-600 mt-1">Manage team members and their permissions</p>
          </div>
        </div>
        <div className="text-center py-8">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-gray-600 mt-1">Manage team members and their permissions</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          Invite Member
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            View and manage all members of your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable 
            members={members}
            onManageTeams={handleManageTeams}
            onRemoveMember={handleRemoveMember}
          />
        </CardContent>
      </Card>

      <InviteMemberDialog 
        isOpen={inviteDialogOpen}
        onClose={handleInviteClose}
      />

      {selectedMember && (
        <>
          <ManageTeamAccessDialog 
            isOpen={manageTeamsDialogOpen}
            onClose={() => {
              setManageTeamsDialogOpen(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            onSuccess={() => {
              refetch();
              setManageTeamsDialogOpen(false);
              setSelectedMember(null);
            }}
          />

          <RemoveMemberDialog 
            isOpen={removeMemberDialogOpen}
            onClose={() => {
              setRemoveMemberDialogOpen(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            onSuccess={() => {
              refetch();
              setRemoveMemberDialogOpen(false);
              setSelectedMember(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default MembersSettings;
