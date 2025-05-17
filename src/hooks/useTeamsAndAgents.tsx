
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Agent {
  id: string;
  name: string;
  image: string;
  color: string;
  status: string;
  metrics: {
    conversations: number;
    responseTime: string;
    satisfaction: number;
  };
}

export interface Team {
  id: string;
  name: string;
  isActive: boolean; // Required property
  agents: Agent[];
  metrics: {
    totalConversations: number;
    avgResponseTime: string;
    usagePercent: number;
    apiCalls: number;
    satisfaction: number;
  };
}

export const useTeamsAndAgents = () => {
  const { user } = useAuth();
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

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

  return {
    teamsData,
    setTeamsData,
    selectedTeam,
    setSelectedTeam,
    loading
  };
};
