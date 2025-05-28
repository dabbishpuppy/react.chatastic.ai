
import { ChatMessage } from "@/types/chatInterface";
import { messageService } from "@/services/messageService";

export const handleFeedback = async (
  timestamp: string,
  type: "like" | "dislike",
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  messageId?: string
) => {
  // Update local state immediately for responsiveness
  setChatHistory(prev => 
    prev.map(msg => {
      if (msg.timestamp === timestamp) {
        const newFeedback = msg.feedback === type ? undefined : type;
        
        // Update database if message has an ID
        if (msg.id) {
          messageService.updateMessageFeedback(msg.id, newFeedback || null);
        }
        
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    })
  );
  
  console.log(`Feedback ${type} for message at ${timestamp}`);
};
