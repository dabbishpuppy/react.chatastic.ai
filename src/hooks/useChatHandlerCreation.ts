
import { useMessageHandlers } from "@/hooks/useMessageHandlers";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { ChatMessage } from "@/types/chatInterface";

interface UseChatHandlerCreationProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setIsTyping: (value: boolean) => void;
  setMessage: (message: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  conversationId?: string;
  setRateLimitError: (error: string | null) => void;
  setTimeUntilReset: (time: number | null) => void;
  rateLimitError: string | null;
  agentId?: string;
  message: string;
  submitMessage: (text: string, agentIdParam?: string) => Promise<void>;
}

export const useChatHandlerCreation = ({
  chatHistory,
  isTyping,
  setChatHistory,
  setIsTyping,
  setMessage,
  inputRef,
  conversationId,
  setRateLimitError,
  setTimeUntilReset,
  rateLimitError,
  agentId,
  message,
  submitMessage
}: UseChatHandlerCreationProps) => {
  // Set up message handlers
  const {
    handleFeedback: handleFeedbackOriginal,
    regenerateResponse,
    insertEmoji,
    handleCountdownFinished
  } = useMessageHandlers({
    chatHistory,
    isTyping,
    setChatHistory,
    setIsTyping,
    setMessage,
    inputRef,
    conversationId,
    setRateLimitError,
    setTimeUntilReset,
    rateLimitError
  });

  // Create wrapper for handleFeedback to match expected signature
  const handleFeedback = (messageId: string, isPositive: boolean) => {
    // Find the message by ID to get its timestamp
    const messageData = chatHistory.find(msg => msg.id === messageId);
    if (messageData) {
      const feedbackType = isPositive ? "like" : "dislike";
      handleFeedbackOriginal(messageData.timestamp, feedbackType);
    }
  };

  // Create submit handler
  const handleSubmit = async (e: React.FormEvent, agentIdParam?: string) => {
    e.preventDefault();
    await submitMessage(message.trim(), agentIdParam || agentId);
  };

  // Create suggested message click handler
  const handleSuggestedMessageClick = async (text: string, agentIdParam?: string) => {
    setMessage(text);
    await submitMessage(text, agentIdParam || agentId);
  };

  // Create regenerate handler that matches the useChatHandlers expected signature
  const regenerateResponseWrapper = async (allowRegenerate: boolean) => {
    await regenerateResponse(allowRegenerate);
  };

  // Create a proper handleRegenerate function that matches the expected signature for the state
  const handleRegenerate = async (messageIndex: number, agentIdParam?: string) => {
    // Call the regenerateResponse with allowRegenerate=true
    await regenerateResponse(true);
  };

  const { handleSubmitWithAgentId, handleSuggestedMessageClickWithAgentId, handleRegenerateWithAgentId } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponseWrapper);

  return {
    handleFeedback,
    insertEmoji,
    handleCountdownFinished,
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId: handleRegenerate
  };
};
