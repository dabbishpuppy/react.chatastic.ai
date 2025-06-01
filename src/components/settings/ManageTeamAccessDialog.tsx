
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X, UserPlus, Settings } from "lucide-react";

interface TeamWithAccess {
  id: string;
  name: string;
  userRole?: "owner" | "admin" | "member";
  hasAccess: boolean;
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
  const [allTeams, setAllTeams] = useState<TeamWithAccess[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"owner" | "admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAllTeamsWithAccess();
      setSelectedTeamId("");
      setSelectedRole("member");
    }
  }, [isOpen, member.user_id]);

  const fetchAllTeamsWithAccess = async () => {
    try {
      // Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');

      if (teamsError) throw teamsError;

      // Get user's current team memberships with roles
      const { data: memberships, error: membershipsError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams!inner(name)
        `)
        .eq('user_id', member.user_id);

      if (membershipsError) throw membershipsError;

      // Create membership map for quick lookup
      const membershipMap = new Map(
        memberships?.map(m => [m.team_id, m.role]) || []
      );

      // Combine teams with access information
      const teamsWithAccess: TeamWithAccess[] = teams?.map(team => ({
        id: team.id,
        name: team.name,
        userRole: membershipMap.get(team.id) as "owner" | "admin" | "member" | undefined,
        hasAccess: membershipMap.has(team.id)
      })) || [];

      setAllTeams(teamsWithAccess);
    } catch (error: any) {
      console.error('Error fetching teams with access:', error);
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTeamAccess = async () => {
    if (!selectedTeamId) {
      toast({
        title: "Please select a team",
        description: "You must select a team before adding access.",
        variant: "destructive",
      });
      return;
    }

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

      // Reset form
      setSelectedTeamId("");
      setSelectedRole("member");
      
      // Refresh teams
      await fetchAllTeamsWithAccess();
      
      onSuccess();
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

  const handleRoleChange = async (teamId: string, newRole: "owner" | "admin" | "member") => {
    setRoleUpdating(teamId);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('user_id', member.user_id)
        .eq('team_id', teamId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User's role has been updated successfully.",
      });

      // Refresh teams
      await fetchAllTeamsWithAccess();
      
      onSuccess();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRoleUpdating(null);
    }
  };

  const handleRemoveTeamAccess = async (teamId: string) => {
    const currentMemberships = allTeams.filter(team => team.hasAccess);
    
    if (currentMemberships.length <= 1) {
      toast({
        title: "Cannot remove access",
        description: "User must belong to at least one team.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', member.user_id)
        .eq('team_id', teamId);

      if (error) throw error;

      toast({
        title: "Team access removed",
        description: "User has been removed from the team successfully.",
      });

      // Refresh teams
      await fetchAllTeamsWithAccess();
      
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

  const currentTeams = allTeams.filter(team => team.hasAccess);
  const availableTeams = allTeams.filter(team => !team.hasAccess);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Team Access</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-gray-700">User</Label>
            <p className="text-sm text-gray-900">{member.email}</p>
          </div>

          {/* Current Team Memberships */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Current Team Memberships ({currentTeams.length})
            </Label>
            
            {currentTeams.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No team memberships</p>
            ) : (
              <div className="space-y-3">
                {currentTeams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{team.name}</span>
                      <Badge className={getRoleColor(team.userRole!)}>
                        {team.userRole?.charAt(0).toUpperCase() + team.userRole?.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={team.userRole}
                        onValueChange={(value: "owner" | "admin" | "member") => handleRoleChange(team.id, value)}
                        disabled={roleUpdating === team.id}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {currentTeams.length > 1 && (
                        <button
                          onClick={() => handleRemoveTeamAccess(team.id)}
                          disabled={loading || roleUpdating === team.id}
                          className="hover:bg-gray-100 rounded-full p-1 transition-colors"
                        >
                          <X size={14} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add to New Teams */}
          {availableTeams.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <UserPlus size={16} />
                Add to Team
              </Label>
              
              <div className="space-y-3">
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team to add user to" />
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

          {availableTeams.length === 0 && currentTeams.length > 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">User has access to all available teams</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading || roleUpdating !== null}>
            Cancel
          </Button>
          {selectedTeamId && (
            <Button onClick={handleAddTeamAccess} disabled={loading || roleUpdating !== null}>
              {loading ? "Adding..." : "Add to Team"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageTeamAccessDialog;
