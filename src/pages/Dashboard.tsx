import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

const Dashboard = () => {
  const { user, session, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("agents");
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    agents: true
  });
  const navigate = useNavigate();

  // Auth check and data loading
  useEffect(() => {
    console.log("Dashboard useEffect - session:", session ? "exists" : "none", "authLoading:", authLoading);
    
    const checkAuthAndLoadData = async () => {
      try {
        // If auth is still loading, wait
        if (authLoading) {
          console.log("Auth is still loading...");
          return;
        }
        
        setIsLoading(true);
        
        // Check authentication
        if (!session) {
          console.log("No session found, redirecting to sign in");
          toast.error("Please sign in to access the dashboard");
          navigate("/signin");
          return;
        }

        console.log("User authenticated:", session.user.id);
        
        // Get user data to check email verification
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user && !userData.user.email_confirmed_at) {
          console.log("Email not verified");
          toast.error("Please verify your email before accessing the dashboard");
          await supabase.auth.signOut();
          navigate("/signin");
          return;
        }
        
        console.log("Loading teams data...");
        
        // Load teams the user belongs to
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', session.user.id);
          
        if (teamMembersError) {
          console.error("Error fetching team members:", teamMembersError);
          throw teamMembersError;
        }
        
        console.log("Team members data:", teamMembers);
        
        if (!teamMembers || teamMembers.length === 0) {
          // User has no teams, redirect to onboarding
          console.log("User has no teams, redirecting to create team page");
          navigate("/onboarding/create-team");
          return;
        }
        
        const teamIds = teamMembers.map(member => member.team_id);
        
        // Fetch full team data with is_active status
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
          
        if (teamsError) {
          console.error("Error fetching teams:", teamsError);
          throw teamsError;
        }
        
        console.log("Teams data:", teams);
        
        if (!teams || teams.length === 0) {
          console.log("No teams found, redirecting to create team page");
          navigate("/onboarding/create-team");
          return;
        }
        
        // Load agents and metrics for each team
        const teamsWithAgents = await Promise.all(teams.map(async (team) => {
          // Fetch agents for this team
          const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .eq('team_id', team.id);
            
          if (agentsError) {
            console.error("Error fetching agents:", agentsError);
            throw agentsError;
          }
          
          console.log(`Agents for team ${team.id}:`, agents);
          
          // Fetch metrics for each agent
          const agentsWithMetrics = await Promise.all((agents || []).map(async (agent) => {
            const { data: metrics, error: metricsError } = await supabase
              .from('agent_metrics')
              .select('*')
              .eq('agent_id', agent.id)
              .single();
              
            if (metricsError && metricsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
              console.error("Error fetching agent metrics:", metricsError);
            }
            
            return {
              ...agent,
              metrics: metrics ? {
                conversations: metrics.conversations,
                responseTime: metrics.response_time,
                satisfaction: metrics.satisfaction
              } : {
                conversations: 0,
                responseTime: "0.0s",
                satisfaction: 0
              }
            };
          }));
          
          // Fetch team metrics
          const { data: teamMetrics, error: teamMetricsError } = await supabase
            .from('team_metrics')
            .select('*')
            .eq('team_id', team.id)
            .single();
            
          if (teamMetricsError && teamMetricsError.code !== 'PGRST116') {
            console.error("Error fetching team metrics:", teamMetricsError);
          }
          
          return {
            ...team,
            agents: agentsWithMetrics || [],
            metrics: teamMetrics ? {
              totalConversations: teamMetrics.total_conversations,
              avgResponseTime: teamMetrics.avg_response_time,
              usagePercent: teamMetrics.usage_percent,
              apiCalls: teamMetrics.api_calls,
              satisfaction: teamMetrics.satisfaction
            } : {
              totalConversations: 0,
              avgResponseTime: "0.0s",
              usagePercent: 0,
              apiCalls: 0,
              satisfaction: 0
            }
          };
        }));
        
        console.log("Teams with agents:", teamsWithAgents);
        
        setTeamsData(teamsWithAgents);
        
        // Check if any team is marked as active, otherwise use the first one
        const activeTeam = teamsWithAgents.find(team => team.is_active) || teamsWithAgents[0];
        console.log("Selected team:", activeTeam);
        setSelectedTeam(activeTeam);
        
        // Check if the selected team has agents
        if (activeTeam.agents.length === 0) {
          // No agents, redirect to create agent page
          console.log("Selected team has no agents, redirecting to create agent page");
          navigate("/onboarding/create-agent");
          return;
        }
        
      } catch (error: any) {
        console.error("Error loading dashboard data:", error);
        toast.error(error.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthAndLoadData();
    
    // Set up real-time subscription for teams and agents
    const teamsSubscription = supabase
      .channel('public:teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        console.log("Teams data changed, reloading...");
        checkAuthAndLoadData();
      })
      .subscribe();
      
    const agentsSubscription = supabase
      .channel('public:agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        console.log("Agents data changed, reloading...");
        checkAuthAndLoadData();
      })
      .subscribe();
    
    return () => {
      console.log("Cleaning up dashboard subscriptions");
      supabase.removeChannel(teamsSubscription);
      supabase.removeChannel(agentsSubscription);
    };
  }, [session, authLoading, navigate]);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    if (tab === "settings") {
      navigate("/settings/general");
    }
  };

  const handleTeamSelect = (team: any) => {
    setSelectedTeam(team);
    
    // Update the is_active status in the database
    const updateTeamActive = async () => {
      try {
        // First, set all teams to inactive
        await supabase
          .from('teams')
          .update({ is_active: false })
          .in('id', teamsData.map(t => t.id));
          
        // Then set the selected team to active
        await supabase
          .from('teams')
          .update({ is_active: true })
          .eq('id', team.id);
      } catch (error) {
        console.error("Error updating team active status:", error);
      }
    };
    
    updateTeamActive();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTeamCreated = async (newTeam: any) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // 1. Insert the new team
      const { data, error } = await supabase
        .from('teams')
        .insert([
          { name: newTeam.name, is_active: false }
        ])
        .select();
        
      if (error || !data) throw error || new Error("Failed to create team");
      
      const createdTeam = data[0];
      
      // 2. Add the current user as a team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          { user_id: user.id, team_id: createdTeam.id, role: 'owner' }
        ]);
        
      if (memberError) throw memberError;
      
      // 3. Create empty team metrics
      const { error: metricsError } = await supabase
        .from('team_metrics')
        .insert([{ team_id: createdTeam.id }]);
        
      if (metricsError) throw metricsError;
      
      toast.success(`Team "${newTeam.name}" has been created successfully.`);
      
      // No need to manually update state as we're using real-time subscription
      
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    }
  };

  const handleAgentCreated = async (newAgent: any) => {
    try {
      if (!selectedTeam) {
        throw new Error("No team selected");
      }
      
      // 1. Insert the new agent
      const { data, error } = await supabase
        .from('agents')
        .insert([
          { 
            name: newAgent.name, 
            team_id: selectedTeam.id, 
            color: newAgent.color,
            status: 'active',
            image: '/placeholder.svg'
          }
        ])
        .select();
        
      if (error || !data) throw error || new Error("Failed to create agent");
      
      const createdAgent = data[0];
      
      // 2. Create empty agent metrics
      const { error: metricsError } = await supabase
        .from('agent_metrics')
        .insert([{ 
          agent_id: createdAgent.id,
          conversations: 0,
          response_time: '0.0s',
          satisfaction: 0
        }]);
        
      if (metricsError) throw metricsError;
      
      toast.success(`Agent "${newAgent.name}" has been created successfully.`);
      
      // No need to manually update state as we're using real-time subscription
      
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast.error(error.message || "Failed to create agent");
    }
  };

  const handleTeamEdited = async (updatedTeam: any) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: updatedTeam.name })
        .eq('id', updatedTeam.id);
        
      if (error) throw error;
      
      toast.success(`Team "${updatedTeam.name}" has been updated successfully.`);
      
      // No need to manually update state as we're using real-time subscription
      
    } catch (error: any) {
      console.error("Error updating team:", error);
      toast.error(error.message || "Failed to update team");
    }
  };

  const handleTeamDeleted = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
        
      if (error) throw error;
      
      toast.success("Team has been deleted successfully.");
      
      // No need to manually update state as we're using real-time subscription
      
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error(error.message || "Failed to delete team");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    // This should not happen since we redirect in useEffect, but just in case
    navigate("/signin");
    return null;
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

        {/* Main content - with bg-[#f5f5f5] */}
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          {selectedTeam && (
            <TeamDashboard 
              team={selectedTeam}
              teamsList={teamsData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
