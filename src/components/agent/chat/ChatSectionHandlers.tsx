
import { ChatMessage } from "@/types/chatInterface";

export const useChatSectionHandlers = (
  currentConversation: any,
  conversationSource: 'iframe' | 'bubble',
  agentId: string | undefined,
  isEmbedded: boolean,
  message: string,
  isTyping: boolean,
  rateLimitError: string | null,
  isSubmitting: boolean,
  startNewConversation: () => Promise<void>,
  handleSubmitWithAgentId: (e: React.FormEvent) => Promise<void>,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setHasShownLeadForm: (value: boolean) => void,
  endCurrentConversation: () => Promise<void>,
  loadConversation: (conversationId: string) => Promise<void>,
  getConversationMessages: (conversationId: string) => Promise<ChatMessage[]>,
  setDisplayMessages: (messages: ChatMessage[]) => void,
  initialMessages: ChatMessage[]
) => {
  const handleSubmitWithConversation = async (e: React.FormEvent) => {
    if (!message.trim() || isTyping || rateLimitError || isSubmitting) return;
    
    const messageText = message.trim();
    console.log('📤 Submitting message through ChatSection:', {
      message: messageText.substring(0, 50) + '...',
      hasConversation: !!currentConversation,
      conversationId: currentConversation?.id
    });
    
    // Create conversation FIRST if it doesn't exist (for embedded mode)
    let conversationToUse = currentConversation;
    if (isEmbedded && !conversationToUse && agentId) {
      console.log('🆕 Creating conversation for embedded mode with source:', conversationSource);
      await startNewConversation();
      // The conversation will be available in the next render, but we need it now
      // So we'll let the message handling deal with creating it if needed
    }
    
    // FIXED: Only handle the submission once - proceedWithMessage will save the message
    // Removed the redundant saveMessage call that was causing duplicates
    await handleSubmitWithAgentId(e);
    
    console.log('✅ Message submission completed');
  };

  const handleStartNewChat = async () => {
    await startNewConversation();
    setChatHistory(() => [{
      isAgent: true,
      content: initialMessages[0]?.content || "Hi! I'm Wonder AI. How can I help you today?",
      timestamp: new Date().toISOString()
    }]);
    setHasShownLeadForm(false);
  };

  const handleEndChat = async () => {
    await endCurrentConversation();
  };

  const handleLoadConversation = async (conversationId: string) => {
    await loadConversation(conversationId);
    const messages = await getConversationMessages(conversationId);
    if (messages.length > 0) {
      setChatHistory(() => messages);
      setDisplayMessages(messages);
    }
  };

  return {
    handleSubmitWithConversation,
    handleStartNewChat,
    handleEndChat,
    handleLoadConversation
  };
};
