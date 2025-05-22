
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface Agent {
  id: string;
  name: string;
  image: string;
  color: string;
  status: string;
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  isActive: boolean;
  agents: Agent[];
  metrics?: {
    totalConversations: number;
    avgResponseTime: string;
    usagePercent: number;
    apiCalls: number;
    satisfaction: number;
  };
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("agents");
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    agents: true
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch teams and agents data
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      setLoading(true);
      try {
        // Get all teams the user is a member of
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false });

        if (teamsError) throw teamsError;

        // Get all agents for those teams
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*')
          .in('team_id', teamsData?.map(team => team.id) || [])
          .order('created_at', { ascending: false });
        
        if (agentsError) throw agentsError;

        // Format data for the UI
        const formattedTeams: Team[] = teamsData.map(team => {
          const teamAgents = agentsData.filter(agent => agent.team_id === team.id) || [];
          
          return {
            id: team.id,
            name: team.name,
            isActive: false, // We'll set the first one to active below
            agents: teamAgents.map(agent => ({
              id: agent.id,
              name: agent.name,
              image: agent.image || '/placeholder.svg',
              color: agent.color,
              status: agent.status || 'active',
              team_id: agent.team_id
            })),
            metrics: {
              totalConversations: 0,
              avgResponseTime: "0.0s",
              usagePercent: 0,
              apiCalls: 0,
              satisfaction: 0,
            }
          };
        });

        if (formattedTeams.length > 0) {
          formattedTeams[0].isActive = true;
          setSelectedTeam(formattedTeams[0]);
        }

        setTeamsData(formattedTeams);
      } catch (error: any) {
        console.error('Error fetching data:', error.message);
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, toast]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "settings") {
      navigate("/settings/general");
    }
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    // Update the active state in the teams array
    setTeamsData(prev => prev.map(t => ({
      ...t,
      isActive: t.id === team.id
    })));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTeamCreated = async (newTeam) => {
    try {
      // Insert the new team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add the current user as an owner of the team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: user?.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

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
    } catch (error: any) {
      console.error('Error creating team:', error.message);
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTeamEdited = async (updatedTeam) => {
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
    } catch (error: any) {
      console.error('Error updating team:', error.message);
      toast({
        title: "Error updating team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTeamDeleted = async (teamId) => {
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
    } catch (error: any) {
      console.error('Error deleting team:', error.message);
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAgentCreated = async (newAgent) => {
    if (!selectedTeam) {
      toast({
        title: "Error creating agent",
        description: "No team selected",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: newAgent.name,
          team_id: selectedTeam.id,
          color: newAgent.color,
          image: newAgent.image || '/placeholder.svg',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      const newAgentFormatted = {
        id: data.id,
        name: data.name,
        image: data.image,
        color: data.color,
        status: data.status,
        team_id: data.team_id
      };

      // Update the selected team's agents list
      setTeamsData(prevTeams => prevTeams.map(team => 
        team.id === selectedTeam.id 
          ? { ...team, agents: [...team.agents, newAgentFormatted] } 
          : team
      ));

      setSelectedTeam(prevSelected => {
        if (!prevSelected) return null;
        return {
          ...prevSelected,
          agents: [...prevSelected.agents, newAgentFormatted]
        };
      });
      
      toast({
        title: "Agent created",
        description: `${newAgent.name} has been created successfully!`,
      });
    } catch (error: any) {
      console.error('Error creating agent:', error.message);
      toast({
        title: "Error creating agent",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAgentEdited = async (updatedAgent) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ name: updatedAgent.name })
        .eq('id', updatedAgent.id);

      if (error) throw error;

      // Update the agent in the teams data
      setTeamsData(prevTeams => prevTeams.map(team => {
        if (team.id === updatedAgent.team_id) {
          return {
            ...team,
            agents: team.agents.map(agent => 
              agent.id === updatedAgent.id ? { ...agent, name: updatedAgent.name } : agent
            )
          };
        }
        return team;
      }));
      
      // Update the selected team if it contains the updated agent
      if (selectedTeam?.id === updatedAgent.team_id) {
        setSelectedTeam({
          ...selectedTeam,
          agents: selectedTeam.agents.map(agent => 
            agent.id === updatedAgent.id ? { ...agent, name: updatedAgent.name } : agent
          )
        });
      }
      
      toast({
        title: "Agent updated",
        description: `Agent has been renamed to "${updatedAgent.name}"`,
      });
    } catch (error: any) {
      console.error('Error updating agent:', error.message);
      toast({
        title: "Error updating agent",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAgentDeleted = async (agentId) => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      // Remove the agent from the teams data
      setTeamsData(prevTeams => prevTeams.map(team => ({
        ...team,
        agents: team.agents.filter(agent => agent.id !== agentId)
      })));
      
      // Update the selected team if it contains the deleted agent
      if (selectedTeam) {
        setSelectedTeam({
          ...selectedTeam,
          agents: selectedTeam.agents.filter(agent => agent.id !== agentId)
        });
      }
      
      toast({
        title: "Agent deleted",
        description: "Agent has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting agent:', error.message);
      toast({
        title: "Error deleting agent",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile menu toggle */}
      {isMobile && (
        <div className="p-4 border-b border-gray-200 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu size={24} />
          </Button>
          <span className="font-medium">Dashboard</span>
        </div>
      )}

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
          onAgentEdited={handleAgentEdited}
          onAgentDeleted={handleAgentDeleted}
          isMobileOpen={isMobileSidebarOpen}
          setMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Main content - with bg-[#f5f5f5] */}
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          ) : selectedTeam ? (
            <TeamDashboard 
              team={selectedTeam}
              teamsList={teamsData}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <h2 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h2>
              <p className="text-gray-600 mb-8 max-w-md">
                You haven't created any teams yet. Create your first team to get started.
              </p>
              <Button 
                onClick={() => document.querySelector('[aria-label="Create team"]')?.click()}
                size="lg"
              >
                Create Your First Team
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
