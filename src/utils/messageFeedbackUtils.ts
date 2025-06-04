
import { ChatMessage } from "@/types/chatInterface";
import { analyticsService } from "@/services/analyticsService";

export const handleFeedback = async (
  timestamp: string,
  type: "like" | "dislike",
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  messageId?: string
) => {
  console.log('⚠️ messageFeedbackUtils - handleFeedback called but doing nothing. Feedback should be handled by useChatMessageHandlers');
  
  // Do nothing - feedback is now handled locally in each message component via useChatMessageHandlers
  // This prevents the chat history from being modified and causing messages to disappear
  
  console.log(`⚠️ messageFeedbackUtils - Feedback ${type} ignored for message at ${timestamp} - use local feedback handling instead`);
};

// Helper function to validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
