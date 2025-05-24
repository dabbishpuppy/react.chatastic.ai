
import { useParams } from "react-router-dom";

export const useChatHandlers = (
  handleSubmit: (e: React.FormEvent, agentId?: string) => void,
  handleSuggestedMessageClick: (text: string, agentId?: string) => void,
  regenerateResponse: (allowRegenerate: boolean) => void
) => {
  const { agentId } = useParams();

  const handleSubmitWithAgentId = (e: React.FormEvent) => {
    handleSubmit(e, agentId);
  };

  const handleSuggestedMessageClickWithAgentId = (text: string) => {
    handleSuggestedMessageClick(text, agentId);
  };

  const handleRegenerateWithAgentId = (allowRegenerate: boolean) => {
    regenerateResponse(allowRegenerate);
  };

  return {
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  };
};
