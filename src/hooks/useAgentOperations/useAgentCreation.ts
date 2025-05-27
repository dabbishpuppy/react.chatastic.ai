
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Agent, Team } from "@/types/dashboard";

export const useAgentCreation = (
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

  return { handleAgentCreated };
};
