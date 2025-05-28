
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
          newFeedback,
          providedMessageId: messageId
        });
        
        // Use the provided messageId if available, otherwise fall back to msg.id
        const dbMessageId = messageId || msg.id;
        
        // Update database if we have a message ID
        if (dbMessageId && dbMessageId !== 'initial-message') {
          console.log('💾 Calling analyticsService to update feedback in database with ID:', dbMessageId);
          analyticsService.updateMessageFeedback(dbMessageId, newFeedback || null)
            .then(success => {
              if (success) {
                console.log('✅ Database feedback update successful for message:', dbMessageId);
              } else {
                console.error('❌ Database feedback update failed for message:', dbMessageId);
              }
            })
            .catch(error => {
              console.error('❌ Error updating feedback in database for message:', dbMessageId, error);
            });
        } else {
          console.warn('⚠️ No valid message ID available, cannot save to database:', { 
            providedMessageId: messageId, 
            msgId: msg.id 
          });
        }
        
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    })
  );
  
  console.log(`Feedback ${type} for message at ${timestamp}`);
};
