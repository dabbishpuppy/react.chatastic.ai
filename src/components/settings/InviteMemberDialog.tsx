
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Team {
  id: string;
  name: string;
}

interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvitationResponse {
  success: boolean;
  error?: string;
  invitation_id?: string;
  message?: string;
}

const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"owner" | "admin" | "member">("member");
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTeams();
    }
  }, [isOpen]);

  const fetchAvailableTeams = async () => {
    try {
      // Get teams where user can manage members (admin or owner)
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          id, 
          name,
          team_members!inner(role)
        `)
        .eq('team_members.user_id', user?.id)
        .in('team_members.role', ['admin', 'owner']);

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

  const handleInvite = async () => {
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

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_team_invitation', {
        team_id_param: selectedTeamId,
        email_param: inviteEmail,
        role_param: selectedRole
      });

      if (error) throw error;

      const response = data as unknown as InvitationResponse;

      if (response.success) {
        toast({
          title: "Invitation sent",
          description: `Invitation sent to ${inviteEmail} with ${selectedRole} role`
        });
        
        setInviteEmail("");
        setSelectedTeamId("");
        setSelectedRole("member");
        onClose();
      } else {
        toast({
          title: "Error sending invitation",
          description: response.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteEmail("");
    setSelectedTeamId("");
    setSelectedRole("member");
    onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={(value: "owner" | "admin" | "member") => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor('member')}`}>
                      Member
                    </span>
                    <span className="text-sm text-gray-600">Can access team resources</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor('admin')}`}>
                      Admin
                    </span>
                    <span className="text-sm text-gray-600">Can manage team members</span>
                  </div>
                </SelectItem>
                <SelectItem value="owner">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor('owner')}`}>
                      Owner
                    </span>
                    <span className="text-sm text-gray-600">Full team control</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? "Sending..." : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
