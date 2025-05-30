
import React, { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, UserPlus, Settings } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import ManageTeamAccessDialog from "@/components/settings/ManageTeamAccessDialog";

const MembersSettings: React.FC = () => {
  const { members, loading, refetch } = useTeamMembers();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const { toast } = useToast();

  const handleInvite = () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    // Here you would normally send an invitation
    toast({
      title: "Invitation sent",
      description: `Invitation sent to ${inviteEmail}`
    });
    
    setInviteEmail("");
    setIsInviteDialogOpen(false);
  };

  const handleManageTeams = (member: any) => {
    setSelectedMember(member);
    setIsManageTeamDialogOpen(true);
  };

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
                    <DropdownMenuItem onClick={() => handleManageTeams(member)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Teams
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>Send invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedMember && (
        <ManageTeamAccessDialog
          isOpen={isManageTeamDialogOpen}
          onClose={() => {
            setIsManageTeamDialogOpen(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default MembersSettings;
