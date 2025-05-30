
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Settings, UserMinus } from "lucide-react";
import { TeamMember } from "@/hooks/useTeamMembers";

interface MemberTableRowProps {
  member: TeamMember;
  onManageTeams: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
}

const MemberTableRow: React.FC<MemberTableRowProps> = ({
  member,
  onManageTeams,
  onRemoveMember
}) => {
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

  return (
    <TableRow key={member.user_id}>
      <TableCell>{member.email}</TableCell>
      <TableCell>{member.memberSince}</TableCell>
      <TableCell>
        <Badge className={getRoleColor(member.role)}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </Badge>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onManageTeams(member)}
              className="text-sm"
              style={{ fontSize: '0.875rem' }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Manage Teams
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onRemoveMember(member)}
              className="text-sm text-red-600 hover:text-red-700"
              style={{ fontSize: '0.875rem' }}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default MemberTableRow;
