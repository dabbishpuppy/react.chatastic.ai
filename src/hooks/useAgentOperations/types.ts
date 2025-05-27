
import { Agent, Team } from "@/types/dashboard";

// Interface for the delete_agent_and_related_data function response
export interface AgentDeletionResponse {
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

export interface AgentOperationsHookProps {
  teamsData: Team[];
  setTeamsData: React.Dispatch<React.SetStateAction<Team[]>>;
  selectedTeam: Team | null;
  setSelectedTeam: React.Dispatch<React.SetStateAction<Team | null>>;
}

export interface AgentOperations {
  handleAgentCreated: (newAgent: Omit<Agent, "id">) => Promise<Agent>;
  handleAgentEdited: (updatedAgent: Agent) => Promise<Agent>;
  handleAgentDeleted: (agentId: string) => Promise<string>;
}
