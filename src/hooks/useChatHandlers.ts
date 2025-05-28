
import { useParams } from "react-router-dom";

export const useChatHandlers = (
  handleSubmit: (e: React.FormEvent, agentId?: string) => Promise<void>,
  handleSuggestedMessageClick: (text: string, agentId?: string) => Promise<void>,
  regenerateResponse: (allowRegenerate: boolean) => Promise<void>
) => {
  const { agentId } = useParams();

  const handleSubmitWithAgentId = async (e: React.FormEvent) => {
    await handleSubmit(e, agentId);
  };

  const handleSuggestedMessageClickWithAgentId = async (text: string) => {
    await handleSuggestedMessageClick(text, agentId);
  };

  const handleRegenerateWithAgentId = async (allowRegenerate: boolean) => {
    await regenerateResponse(allowRegenerate);
  };

  return {
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  };
};
