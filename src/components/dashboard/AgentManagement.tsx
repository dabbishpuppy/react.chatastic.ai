
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
      console.error("Error creating agent:", error);
      toast({
        title: "Failed to create agent",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  return {
    handleAgentCreated
  };
};
