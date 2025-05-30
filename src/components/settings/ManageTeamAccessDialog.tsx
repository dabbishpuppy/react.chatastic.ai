
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

interface ManageTeamAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    user_id: string;
    email: string;
    teams: string[];
  };
  onSuccess: () => void;
}

const ManageTeamAccessDialog: React.FC<ManageTeamAccessDialogProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"owner" | "admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTeams();
    }
  }, [isOpen, member.teams]);

  const fetchAvailableTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name');

      if (error) throw error;

      // Filter out teams the user already belongs to
      const availableTeams = teams?.filter(team => 
        !member.teams.includes(team.name)
      ) || [];

      setAvailableTeams(availableTeams);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTeamAccess = async () => {
    if (!selectedTeamId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          user_id: member.user_id,
          team_id: selectedTeamId,
          role: selectedRole
        });

      if (error) throw error;

      toast({
        title: "Team access granted",
        description: "User has been added to the team successfully.",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding team access:', error);
      toast({
        title: "Error granting team access",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeamAccess = async (teamName: string) => {
    if (member.teams.length <= 1) {
      toast({
        title: "Cannot remove access",
        description: "User must belong to at least one team.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get team ID by name
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', teamName)
        .single();

      if (teamError) throw teamError;

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', member.user_id)
        .eq('team_id', team.id);

      if (error) throw error;

      toast({
        title: "Team access removed",
        description: "User has been removed from the team successfully.",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error removing team access:', error);
      toast({
        title: "Error removing team access",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Team Access</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-gray-700">User</Label>
            <p className="text-sm text-gray-900">{member.email}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Current Teams</Label>
            <div className="flex flex-wrap gap-2">
              {member.teams.map((teamName) => (
                <Badge key={teamName} variant="secondary" className="flex items-center gap-2">
                  {teamName}
                  {member.teams.length > 1 && (
                    <button
                      onClick={() => handleRemoveTeamAccess(teamName)}
                      disabled={loading}
                      className="hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {availableTeams.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">Add to Team</Label>
              
              <div className="space-y-3">
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

                <Select value={selectedRole} onValueChange={(value: "owner" | "admin" | "member") => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {selectedTeamId && (
            <Button onClick={handleAddTeamAccess} disabled={loading}>
              Add to Team
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageTeamAccessDialog;
