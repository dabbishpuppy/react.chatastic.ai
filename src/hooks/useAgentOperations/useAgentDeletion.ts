
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types/dashboard";
import { AgentDeletionResponse } from "./types";

export const useAgentDeletion = (
  teamsData: Team[],
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>,
  selectedTeam: Team | null,
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>
) => {
  const { toast } = useToast();

  const handleAgentDeleted = async (agentId: string) => {
    try {
      // Use the new database function for safe deletion with cascading
      const { data, error } = await supabase
        .rpc('delete_agent_and_related_data', { agent_id_param: agentId });

      if (error) throw error;

      // Type assertion for the response data - first cast to unknown, then to our interface
      const deletionResult = data as unknown as AgentDeletionResponse;

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

  return { handleAgentDeleted };
};
