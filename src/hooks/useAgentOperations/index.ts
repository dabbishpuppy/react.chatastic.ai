
import { useAgentCreation } from "./useAgentCreation";
import { useAgentEditing } from "./useAgentEditing";
import { useAgentDeletion } from "./useAgentDeletion";
import { AgentOperationsHookProps, AgentOperations } from "./types";

export const useAgentOperations = ({
  teamsData,
  setTeamsData,
  selectedTeam,
  setSelectedTeam
}: AgentOperationsHookProps): AgentOperations => {
  const { handleAgentCreated } = useAgentCreation(teamsData, setTeamsData, selectedTeam, setSelectedTeam);
  const { handleAgentEdited } = useAgentEditing(teamsData, setTeamsData, selectedTeam, setSelectedTeam);
  const { handleAgentDeleted } = useAgentDeletion(teamsData, setTeamsData, selectedTeam, setSelectedTeam);

  return {
    handleAgentCreated,
    handleAgentEdited,
    handleAgentDeleted
  };
};

// Export types for external use
export type { AgentDeletionResponse, AgentOperationsHookProps, AgentOperations } from "./types";
