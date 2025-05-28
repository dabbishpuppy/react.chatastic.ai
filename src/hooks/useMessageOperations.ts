
import { ChatMessage } from "@/types/chatInterface";
import { proceedWithMessage } from "@/utils/messageProcessingUtils";

interface UseMessageOperationsProps {
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setUserHasMessaged: (value: boolean) => void;
  setIsTyping: (value: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  isEmbedded: boolean;
  conversationId?: string;
  createConversationCallback?: () => Promise<string | null>;
}

export const useMessageOperations = ({
  setChatHistory,
  setUserHasMessaged,
  setIsTyping,
  inputRef,
  isEmbedded,
  conversationId,
  createConversationCallback
}: UseMessageOperationsProps) => {
  
  const proceedWithMessageWrapper = async (text: string) => {
    // Ensure we have a conversation ID before proceeding
    let activeConversationId = conversationId;
    
    if (!activeConversationId && createConversationCallback) {
      console.log('🆕 No conversation ID, creating new conversation before processing message');
      activeConversationId = await createConversationCallback();
      
      if (!activeConversationId) {
        console.error('❌ Failed to create conversation, cannot process message');
        // Still add message to UI for user experience but show error
        const userMessage: ChatMessage = {
          content: text.trim(),
          isAgent: false,
          timestamp: new Date().toISOString(),
        };
        setChatHistory(prev => [...prev, userMessage]);
        setUserHasMessaged(true);
        setIsTyping(true);
        
        // Add error message
        setTimeout(() => {
          const errorMessage: ChatMessage = {
            content: "I'm sorry, there was an issue starting the conversation. Please try refreshing the page.",
            isAgent: true,
            timestamp: new Date().toISOString(),
          };
          setChatHistory(prev => [...prev, errorMessage]);
          setIsTyping(false);
        }, 1000);
        return;
      }
    }

    if (!activeConversationId) {
      console.error('❌ No conversation ID available and no callback to create one');
      return;
    }

    await proceedWithMessage(
      text,
      setChatHistory,
      setUserHasMessaged,
      setIsTyping,
      inputRef,
      isEmbedded,
      activeConversationId
    );
  };

  return {
    proceedWithMessage: proceedWithMessageWrapper
  };
};
