
import { useState, useEffect } from "react";
import { Team, Agent } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useTeamsData = () => {
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
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

  return { teamsData, setTeamsData, selectedTeam, setSelectedTeam, loading };
};
