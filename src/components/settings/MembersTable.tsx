
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import { TeamMember } from "@/hooks/useTeamMembers";
import MemberTableRow from "./MemberTableRow";
import { useRolePermissions } from "@/hooks/useRolePermissions";

interface MembersTableProps {
  members: TeamMember[];
  onManageTeams: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
  selectedTeamId?: string;
}

const MembersTable: React.FC<MembersTableProps> = ({
  members,
  onManageTeams,
  onRemoveMember,
  selectedTeamId
}) => {
  const { permissions, canManageUser } = useRolePermissions(selectedTeamId || null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Teams</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <MemberTableRow
            key={member.user_id}
            member={member}
            onManageTeams={onManageTeams}
            onRemoveMember={onRemoveMember}
            canManage={member.type === 'member' ? canManageUser(member.role) : true}
            canManageTeamMembers={permissions.canManageTeamMembers}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default MembersTable;
