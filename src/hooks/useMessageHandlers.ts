
import { ChatMessage } from "@/types/chatInterface";
import { 
  handleFeedback, 
  regenerateResponse, 
  insertEmoji 
} from "@/utils/messageUtils";

interface UseMessageHandlersProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setIsTyping: (value: boolean) => void;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  inputRef: React.RefObject<HTMLInputElement>;
  conversationId?: string;
  setRateLimitError: (error: string | null) => void;
  setTimeUntilReset: (time: number | null) => void;
  rateLimitError: string | null;
}

export const useMessageHandlers = ({
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
}: UseMessageHandlersProps) => {

  const handleFeedbackWrapper = async (timestamp: string, type: "like" | "dislike") => {
    await handleFeedback(timestamp, type, setChatHistory);
  };

  const regenerateResponseWrapper = async (allowRegenerate: boolean) => {
    await regenerateResponse(
      allowRegenerate,
      chatHistory,
      isTyping,
      setChatHistory,
      setIsTyping,
      inputRef,
      conversationId
    );
  };

  const insertEmojiWrapper = (emoji: string) => {
    // Create a proper wrapper that matches what insertEmoji expects
    const wrappedSetMessage = (update: (prev: string) => string) => {
      setMessage(update);
    };
    
    insertEmoji(emoji, isTyping, rateLimitError, wrappedSetMessage, inputRef);
  };

  // Handle countdown finish - clear rate limit error
  const handleCountdownFinished = () => {
    setRateLimitError(null);
    setTimeUntilReset(null);
    
    // Focus input field when rate limit is cleared
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return {
    handleFeedback: handleFeedbackWrapper,
    regenerateResponse: regenerateResponseWrapper,
    insertEmoji: insertEmojiWrapper,
    handleCountdownFinished
  };
};
