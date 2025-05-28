
import { ChatMessage } from "@/types/chatInterface";
import { analyticsService } from "@/services/analyticsService";

export const handleFeedback = async (
  timestamp: string,
  type: "like" | "dislike",
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  messageId?: string
) => {
  console.log('🎯 messageFeedbackUtils - handleFeedback called:', { timestamp, type, messageId });
  
  // Update local state immediately for responsiveness
  setChatHistory(prev => 
    prev.map(msg => {
      if (msg.timestamp === timestamp) {
        const newFeedback = msg.feedback === type ? undefined : type;
        
        console.log('📝 Updating message locally:', { 
          messageId: msg.id, 
          timestamp, 
          oldFeedback: msg.feedback, 
          newFeedback 
        });
        
        // Update database if message has an ID
        if (msg.id) {
          console.log('💾 Calling analyticsService to update feedback in database');
          analyticsService.updateMessageFeedback(msg.id, newFeedback || null)
            .then(success => {
              if (success) {
                console.log('✅ Database feedback update successful');
              } else {
                console.error('❌ Database feedback update failed');
              }
            })
            .catch(error => {
              console.error('❌ Error updating feedback in database:', error);
            });
        } else {
          console.warn('⚠️ Message has no ID, cannot save to database');
        }
        
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    })
  );
  
  console.log(`Feedback ${type} for message at ${timestamp}`);
};
