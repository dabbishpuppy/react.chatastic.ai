
import { ChatSectionProps } from "@/components/agent/chat/ChatSectionProps";
import { useChatSectionHandlers } from "@/components/agent/chat/ChatSectionHandlers";

export const useChatDataHandlers = (
  props: ChatSectionProps,
  hooks: any
) => {
  const {
    currentConversation,
    agentId,
    message,
    isTyping,
    rateLimitError,
    isSubmitting,
    startNewConversation,
    handleSubmitWithAgentId,
    setChatHistory,
    setHasShownLeadForm,
    endCurrentConversation,
    loadConversation,
    getConversationMessages,
    setDisplayMessages
  } = hooks;

  const wrappedStartNewConversation = async () => {
    await startNewConversation();
  };

  const {
    handleSubmitWithConversation,
    handleStartNewChat,
    handleEndChat,
    handleLoadConversation
  } = useChatSectionHandlers(
    currentConversation,
    props.conversationSource || 'iframe',
    agentId,
    props.isEmbedded || false,
    message,
    isTyping,
    rateLimitError,
    isSubmitting,
    wrappedStartNewConversation,
    handleSubmitWithAgentId,
    setChatHistory,
    setHasShownLeadForm,
    endCurrentConversation,
    loadConversation,
    getConversationMessages,
    setDisplayMessages,
    props.initialMessages || []
  );

  return {
    handleSubmitWithConversation,
    handleStartNewChat,
    handleEndChat,
    handleLoadConversation
  };
};
