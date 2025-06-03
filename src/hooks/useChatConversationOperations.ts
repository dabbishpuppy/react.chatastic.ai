
import { useParams } from "react-router-dom";
import { useConversationManager } from "@/hooks/useConversationManager";
import { ChatSectionProps } from "@/components/agent/chat/ChatSectionProps";

export const useChatConversationOperations = (
  propAgentId: string | undefined,
  conversationSource: 'iframe' | 'bubble' | undefined
) => {
  const { agentId: routeAgentId } = useParams();
  const agentId = propAgentId || routeAgentId;

  const { 
    currentConversation, 
    conversationEnded, 
    startNewConversation, 
    endCurrentConversation, 
    loadConversation, 
    saveMessage, 
    getConversationMessages 
  } = useConversationManager(conversationSource);

  // Enhanced getConversationMessages that uses the agentId
  const getConversationMessagesWithAgent = async (conversationId: string) => {
    console.log('🔄 Getting conversation messages with agent ID:', agentId, 'for conversation:', conversationId);
    return await getConversationMessages(conversationId);
  };

  // Wrap startNewConversation to match expected return type
  const wrappedStartNewConversation = async () => {
    await startNewConversation();
  };

  return {
    agentId,
    currentConversation,
    conversationEnded,
    startNewConversation: wrappedStartNewConversation,
    endCurrentConversation,
    loadConversation,
    getConversationMessages: getConversationMessagesWithAgent
  };
};
