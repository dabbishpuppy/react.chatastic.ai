import React, { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, UserPlus, Settings, UserMinus } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import ManageTeamAccessDialog from "@/components/settings/ManageTeamAccessDialog";
import { supabase } from "@/integrations/supabase/client";

const MembersSettings: React.FC = () => {
  const { members, loading, refetch } = useTeamMembers();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [availableTeams, setAvailableTeams] = useState<Array<{id: string, name: string}>>([]);
  const { toast } = useToast();

  // Fetch available teams when invite dialog opens
  React.useEffect(() => {
    if (isInviteDialogOpen) {
      fetchAvailableTeams();
    }
  }, [isInviteDialogOpen]);

  const fetchAvailableTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name');

      if (error) throw error;
      setAvailableTeams(teams || []);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTeamId) {
      toast({
        title: "Error",
        description: "Please select a team for the new member.",
        variant: "destructive"
      });
      return;
    }

    // Here you would normally send an invitation
    toast({
      title: "Invitation sent",
      description: `Invitation sent to ${inviteEmail} for the selected team`
    });
    
    setInviteEmail("");
    setSelectedTeamId("");
    setIsInviteDialogOpen(false);
  };

  const handleManageTeams = (member: any) => {
    setSelectedMember(member);
    setIsManageTeamDialogOpen(true);
  };

  const handleRemoveMember = (member: any) => {
    setSelectedMember(member);
    setIsRemoveConfirmOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', selectedMember.user_id);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${selectedMember.email} has been removed from all teams.`,
      });

      refetch();
      setIsRemoveConfirmOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
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
                    <DropdownMenuItem 
                      onClick={() => handleManageTeams(member)}
                      className="text-sm"
                      style={{ fontSize: '0.875rem' }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Teams
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleRemoveMember(member)}
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
            <div className="grid gap-2">
              <Label htmlFor="team">Team access</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <AlertDialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.email} from all teams? This action cannot be undone.
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
