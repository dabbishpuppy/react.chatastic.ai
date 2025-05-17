
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";
import { supabase, Team } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import TeamEmptyState from "@/components/dashboard/TeamEmptyState";
import AgentEmptyState from "@/components/dashboard/AgentEmptyState";

const Dashboard = () => {
  const { user } = useAuth();
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    agents: true
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    const fetchTeamsAndAgents = async () => {
      try {
        setLoading(true);
        
        // Fetch teams for the current user
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (teamsError) throw teamsError;
        
        if (teams && teams.length > 0) {
          // For each team, fetch its agents
          const teamsWithAgents = await Promise.all(
            teams.map(async (team) => {
              const { data: agents, error: agentsError } = await supabase
                .from('agents')
                .select('*')
                .eq('team_id', team.id)
                .order('created_at', { ascending: false });
              
              if (agentsError) throw agentsError;
              
              // Add additional properties needed by the UI
              return {
                ...team,
                isActive: teams.indexOf(team) === 0, // First team is active by default
                agents: agents?.map(agent => ({
                  ...agent,
                  metrics: {
                    conversations: agent.conversations || 0,
                    responseTime: agent.response_time || "0.0s",
                    satisfaction: agent.satisfaction || 0,
                  }
                })) || [],
                metrics: {
                  totalConversations: team.total_conversations || 0,
                  avgResponseTime: team.avg_response_time || "0.0s",
                  usagePercent: team.usage_percent || 0,
                  apiCalls: team.api_calls || 0,
                  satisfaction: team.satisfaction || 0,
                }
              };
            })
          );
          
          setTeamsData(teamsWithAgents);
          setSelectedTeam(teamsWithAgents[0]);
        } else {
          setTeamsData([]);
          setSelectedTeam(null);
        }
      } catch (error) {
        console.error("Error fetching teams and agents:", error);
        toast({
          title: "Failed to load data",
          description: "There was an error loading your teams and agents.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndAgents();
    
    // Subscribe to realtime changes
    const teamsSubscription = supabase
      .channel('teams-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'teams', filter: `user_id=eq.${user.id}` }, 
          () => {
            fetchTeamsAndAgents();
          })
      .subscribe();
      
    const agentsSubscription = supabase
      .channel('agents-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'agents' }, 
          () => {
            fetchTeamsAndAgents();
          })
      .subscribe();
    
    return () => {
      teamsSubscription.unsubscribe();
      agentsSubscription.unsubscribe();
    };
  }, [user?.id]);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    
    // Update isActive status in the teamsData array
    setTeamsData(prevTeams => 
      prevTeams.map(t => ({
        ...t,
        isActive: t.id === team.id
      }))
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTeamCreated = async (newTeam) => {
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

  const handleTeamEdited = async (updatedTeam) => {
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
        setSelectedTeam(prev => ({ ...prev, name: updatedTeam.name }));
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

  const handleTeamDeleted = async (teamId) => {
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

  const handleAgentCreated = async (newAgent) => {
    if (!selectedTeam) return;
    
    try {
      // Insert the new agent into Supabase
      const { data, error } = await supabase
        .from('agents')
        .insert([
          { 
            name: newAgent.name,
            team_id: selectedTeam.id,
            color: newAgent.color,
            image: newAgent.image || "/placeholder.svg",
            status: newAgent.status || "active",
            conversations: 0,
            response_time: "0.0s",
            satisfaction: 0
          }
        ])
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Add the new agent to the UI with needed properties
      const agentWithUI = {
        ...data,
        metrics: {
          conversations: 0,
          responseTime: "0.0s",
          satisfaction: 0,
        }
      };
      
      // Update the selected team with the new agent
      const updatedTeam = {
        ...selectedTeam,
        agents: [agentWithUI, ...selectedTeam.agents]
      };
      
      setSelectedTeam(updatedTeam);
      
      // Update the teams data array
      setTeamsData(prevTeams => prevTeams.map(team => 
        team.id === selectedTeam.id ? updatedTeam : team
      ));
      
      toast({
        title: "Agent created",
        description: `${newAgent.name} agent has been created successfully!`,
      });
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast({
        title: "Failed to create agent",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get all agents for other components
  const allAgents = teamsData.flatMap(team => team.agents);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If there are no teams, show the empty state
  if (teamsData.length === 0) {
    return <TeamEmptyState onCreateTeam={handleTeamCreated} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          teams={teamsData}
          selectedTeam={selectedTeam}
          expandedSections={expandedSections}
          onTeamSelect={handleTeamSelect}
          toggleSection={toggleSection}
          onTeamCreated={handleTeamCreated}
          onAgentCreated={handleAgentCreated}
          onTeamEdited={handleTeamEdited}
          onTeamDeleted={handleTeamDeleted}
        />

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          {selectedTeam && selectedTeam.agents.length > 0 ? (
            <TeamDashboard 
              team={selectedTeam}
              teamsList={teamsData}
            />
          ) : (
            <AgentEmptyState teamName={selectedTeam?.name} onCreateAgent={handleAgentCreated} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
