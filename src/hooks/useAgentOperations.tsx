import { Agent, Team } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Interface for the delete_agent_and_related_data function response
interface AgentDeletionResponse {
  success: boolean;
  error?: string;
  agent_id?: string;
  agent_name?: string;
  deleted_counts?: {
    conversations: number;
    messages: number;
    leads: number;
    chat_interface_settings: number;
    lead_settings: number;
    notification_settings: number;
  };
}

export const useAgentOperations = (
  teamsData: Team[], 
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>, 
  selectedTeam: Team | null, 
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>
) => {
  const { toast } = useToast();

  const handleAgentCreated = async (newAgent: Omit<Agent, "id">) => {
    if (!selectedTeam) {
      toast({
        title: "Error creating agent",
        description: "No team selected",
        variant: "destructive",
      });
      throw new Error("No team selected");
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: newAgent.name,
          team_id: selectedTeam.id,
          color: newAgent.color,
          image: newAgent.image || '/placeholder.svg',
          status: newAgent.status || 'active'
        })
        .select()
        .single();

      if (error) throw error;

      const newAgentFormatted: Agent = {
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
      
      return newAgentFormatted;
    } catch (error: any) {
      console.error('Error creating agent:', error.message);
      toast({
        title: "Error creating agent",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

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

  const handleAgentDeleted = async (agentId: string) => {
    try {
      // Use the new database function for safe deletion with cascading
      const { data, error } = await supabase
        .rpc('delete_agent_and_related_data', { agent_id_param: agentId });

      if (error) throw error;

      // Type assertion for the response data
      const deletionResult = data as AgentDeletionResponse;

      // Check if deletion was successful
      if (!deletionResult?.success) {
        throw new Error(deletionResult?.error || 'Failed to delete agent');
      }

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
      
      // Show detailed deletion summary
      const deletedCounts = deletionResult.deleted_counts;
      const totalDeleted = deletedCounts ? Object.values(deletedCounts).reduce((sum: number, count: number) => sum + count, 0) : 0;
      
      toast({
        title: "Agent deleted successfully",
        description: `"${deletionResult.agent_name}" and ${totalDeleted} related records have been deleted`,
      });
      
      console.log('Agent deletion summary:', deletionResult);
      
      return agentId;
    } catch (error: any) {
      console.error('Error deleting agent:', error.message);
      toast({
        title: "Error deleting agent",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    handleAgentCreated,
    handleAgentEdited,
    handleAgentDeleted
  };
};
