
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Agent, Team } from "@/types/dashboard";

export const useAgentEditing = (
  teamsData: Team[],
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>,
  selectedTeam: Team | null,
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>
) => {
  const { toast } = useToast();

  const handleAgentEdited = async (updatedAgent: Agent) => {
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
      
      return updatedAgent;
    } catch (error: any) {
      console.error('Error updating agent:', error.message);
      toast({
        title: "Error updating agent",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return { handleAgentEdited };
};
