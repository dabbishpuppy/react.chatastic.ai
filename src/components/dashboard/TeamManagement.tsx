
import React from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Team } from "@/hooks/useTeamsAndAgents";
import { useAuth } from "@/contexts/AuthContext";

interface TeamManagementProps {
  teamsData: Team[];
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>;
  selectedTeam: Team | null;
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>;
}

export const useTeamManagement = ({
  teamsData,
  setTeamsData,
  selectedTeam,
  setSelectedTeam
}: TeamManagementProps) => {
  const { user } = useAuth();

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    
    // Update isActive status in the teamsData array
    setTeamsData(prevTeams => 
      prevTeams.map(t => ({
        ...t,
        isActive: t.id === team.id
      }))
    );
  };

  const handleTeamCreated = async (newTeam: {
    name: string;
  }) => {
    if (!user?.id) return;

    try {
      // Insert the new team into Supabase
      const { data, error } = await supabase
        .from('teams')
        .insert([
          { 
            name: newTeam.name, 
            user_id: user.id,
            total_conversations: 0,
            avg_response_time: "0.0s",
            usage_percent: 0,
            api_calls: 0,
            satisfaction: 0
          }
        ])
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Add the new team to the UI with needed properties
      const teamWithUI = {
        ...data,
        isActive: true,
        agents: [],
        metrics: {
          totalConversations: 0,
          avgResponseTime: "0.0s",
          usagePercent: 0,
          apiCalls: 0,
          satisfaction: 0,
        }
      };
      
      // Update all other teams to not be active
      const updatedTeams = teamsData.map(team => ({
        ...team,
        isActive: false
      }));
      
      setTeamsData([teamWithUI, ...updatedTeams]);
      setSelectedTeam(teamWithUI);
      
      toast({
        title: "Team created",
        description: `${newTeam.name} team has been created successfully!`,
      });
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTeamEdited = async (updatedTeam: {
    id: string;
    name: string;
  }) => {
    try {
      // Update the team in Supabase
      const { error } = await supabase
        .from('teams')
        .update({ name: updatedTeam.name })
        .eq('id', updatedTeam.id);
      
      if (error) throw error;
      
      // Update the team in the UI
      setTeamsData(prevTeams => prevTeams.map(team => 
        team.id === updatedTeam.id ? { ...team, name: updatedTeam.name } : team
      ));
      
      if (selectedTeam?.id === updatedTeam.id) {
        setSelectedTeam(prev => prev ? { ...prev, name: updatedTeam.name } : null);
      }
      
      toast({
        title: "Team updated",
        description: `${updatedTeam.name} team has been updated successfully!`,
      });
    } catch (error: any) {
      console.error("Error updating team:", error);
      toast({
        title: "Failed to update team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTeamDeleted = async (teamId: string) => {
    try {
      // Delete the team from Supabase
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      // Remove the team from the UI
      const updatedTeams = teamsData.filter(team => team.id !== teamId);
      setTeamsData(updatedTeams);
      
      // If the currently selected team was deleted, select another one
      if (selectedTeam?.id === teamId) {
        if (updatedTeams.length > 0) {
          setSelectedTeam(updatedTeams[0]);
          // Update the first team to be active
          setTeamsData(prevTeams => 
            prevTeams.map((team, index) => ({
              ...team,
              isActive: index === 0
            }))
          );
        } else {
          setSelectedTeam(null);
        }
      }
      
      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully!",
      });
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast({
        title: "Failed to delete team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    handleTeamSelect,
    handleTeamCreated,
    handleTeamEdited,
    handleTeamDeleted
  };
};
