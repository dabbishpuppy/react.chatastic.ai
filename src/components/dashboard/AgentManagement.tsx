
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Team } from "@/hooks/useTeamsAndAgents";

interface AgentManagementProps {
  selectedTeam: Team | null;
  teamsData: Team[];
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>;
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>;
}

export const useAgentManagement = ({
  selectedTeam,
  teamsData,
  setTeamsData,
  setSelectedTeam
}: AgentManagementProps) => {
  
  const handleAgentCreated = async (newAgent: {
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
    teamId: string;
  }) => {
    if (!selectedTeam) return;
    
    try {
      // We don't need to insert the agent here because CreateAgentDialog already does it
      // Just update the local state with the new agent data
      
      // Format the agent to match our expected structure
      const agentWithUI = {
        id: newAgent.id,
        name: newAgent.name,
        image: newAgent.image || "/placeholder.svg",
        color: newAgent.color,
        status: newAgent.status || "active",
        metrics: {
          conversations: 0,
          responseTime: "0.0s",
          satisfaction: 0,
        }
      };
      
      // Update the selected team with the new agent
      if (selectedTeam) {
        const updatedTeam = {
          ...selectedTeam,
          agents: [agentWithUI, ...selectedTeam.agents]
        };
        
        setSelectedTeam(updatedTeam);
        
        // Update the teams data array
        setTeamsData(prevTeams => prevTeams.map(team => 
          team.id === selectedTeam.id ? updatedTeam : team
        ));
      }
      
      toast({
        title: "Agent created",
        description: `${newAgent.name} agent has been created successfully!`,
      });
    } catch (error: any) {
      console.error("Error updating agent state:", error);
      toast({
        title: "Failed to update agent state",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  return {
    handleAgentCreated
  };
};
