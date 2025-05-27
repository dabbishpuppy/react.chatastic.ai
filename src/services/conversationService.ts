
import { ChatMessage } from "@/types/chatInterface";
import { conversationOperations } from "./conversation/conversationOperations";
import { messageOperations } from "./conversation/messageOperations";

// Re-export types for backward compatibility
export type { Conversation, Message } from "./conversation/types";

// Create a unified service that combines all operations
export const conversationService = {
  ...conversationOperations,
  ...messageOperations
};
