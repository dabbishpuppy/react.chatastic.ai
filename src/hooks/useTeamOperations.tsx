
import { useState } from "react";
import { Team, Agent } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useTeamOperations = (
  teamsData: Team[], 
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>, 
  selectedTeam: Team | null, 
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>
) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleTeamCreated = async (newTeam: Omit<Team, 'id' | 'isActive' | 'agents' | 'metrics'>) => {
    try {
      console.log("Creating team:", newTeam);
      console.log("Current auth status:", !!supabase.auth.getSession());
      
      // Insert the new team - user_id will be handled by RLS policy
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name,
          created_by: user?.id // Set the created_by field to current user's ID
        })
        .select()
        .single();

      if (teamError) {
        console.error('Team creation error details:', teamError);
        throw teamError;
      }

      console.log("Team created:", teamData);

      // Add the current user as an owner of the team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: user?.id,
          role: 'owner'
        });

      if (memberError) {
        console.error('Team member creation error:', memberError);
        throw memberError;
      }

      // Format the new team for the UI
      const formattedTeam: Team = {
        id: teamData.id,
        name: teamData.name,
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

      // Update teams data and select the new team
      setTeamsData(prevTeams => {
        const updatedTeams = prevTeams.map(team => ({
          ...team,
          isActive: false
        }));
        return [...updatedTeams, formattedTeam];
      });
      
      setSelectedTeam(formattedTeam);
      
      toast({
        title: "Team created",
        description: `${newTeam.name} team has been created successfully!`,
      });
      
      return formattedTeam;
    } catch (error: any) {
      console.error('Error creating team:', error.message);
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleTeamEdited = async (updatedTeam: Team) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: updatedTeam.name })
        .eq('id', updatedTeam.id);

      if (error) throw error;

      setTeamsData(prevTeams => prevTeams.map(team => 
        team.id === updatedTeam.id ? { ...team, name: updatedTeam.name } : team
      ));
      
      if (selectedTeam?.id === updatedTeam.id) {
        setSelectedTeam({ ...selectedTeam, name: updatedTeam.name });
      }
      
      toast({
        title: "Team updated",
        description: `Team has been renamed to "${updatedTeam.name}"`,
      });
      
      return updatedTeam;
    } catch (error: any) {
      console.error('Error updating team:', error.message);
      toast({
        title: "Error updating team",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleTeamDeleted = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      const updatedTeams = teamsData.filter(team => team.id !== teamId);
      setTeamsData(updatedTeams);
      
      // If the currently selected team was deleted, select another one
      if (selectedTeam?.id === teamId && updatedTeams.length > 0) {
        updatedTeams[0].isActive = true;
        setSelectedTeam(updatedTeams[0]);
      } else if (updatedTeams.length === 0) {
        setSelectedTeam(null);
      }
      
      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully",
      });
      
      return teamId;
    } catch (error: any) {
      console.error('Error deleting team:', error.message);
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return { 
    handleTeamCreated,
    handleTeamEdited,
    handleTeamDeleted
  };
};
