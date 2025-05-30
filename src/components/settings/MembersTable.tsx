
import React from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import { TeamMember } from "@/hooks/useTeamMembers";
import MemberTableRow from "./MemberTableRow";

interface MembersTableProps {
  members: TeamMember[];
  onManageTeams: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
}

const MembersTable: React.FC<MembersTableProps> = ({
  members,
  onManageTeams,
  onRemoveMember
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Member since</TableHead>
          <TableHead>Role</TableHead>
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
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default MembersTable;
