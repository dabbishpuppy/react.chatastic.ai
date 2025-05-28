
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { analyticsService } from "@/services/analyticsService";

export const useChatMessageHandlers = (
  messageId?: string,
  messageTimestamp?: string,
  messageFeedback?: 'like' | 'dislike',
  onFeedback?: (timestamp: string, type: "like" | "dislike") => void,
  onCopy?: (content: string) => void,
  readOnly?: boolean
) => {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);

  const handleCopy = async (content: string) => {
    if (readOnly) return;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      if (onCopy) onCopy(content);
      setShowCopiedTooltip(true);
      toast({
        description: "Copied to clipboard!",
        duration: 2000,
      });
      setTimeout(() => setShowCopiedTooltip(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        description: "Failed to copy to clipboard",
        duration: 2000,
        variant: "destructive"
      });
    }
  };

  const handleFeedback = async (type: "like" | "dislike") => {
    if (isUpdatingFeedback || !onFeedback || !messageTimestamp || readOnly) return;

    setIsUpdatingFeedback(true);
    try {
      console.log('🔥 useChatMessageHandlers - Handling feedback:', { 
        messageId, 
        messageTimestamp, 
        type, 
        messageFeedback,
        hasMessageId: !!messageId,
        messageIdType: typeof messageId
      });
      
      // Determine new feedback value (toggle if same, set if different)
      const newFeedback = messageFeedback === type ? null : type;
      
      // Always try to save to database first if messageId exists
      if (messageId && messageId !== 'initial-message') {
        console.log('💾 useChatMessageHandlers - Saving feedback to database for message:', messageId, 'New feedback:', newFeedback);
        
        const success = await analyticsService.updateMessageFeedback(messageId, newFeedback);
        
        if (success) {
          console.log('✅ useChatMessageHandlers - Feedback saved to database successfully');
          // Call the onFeedback callback to update local state
          onFeedback(messageTimestamp, type);
          toast({
            description: newFeedback ? `Feedback ${type === 'like' ? 'liked' : 'disliked'}` : "Feedback removed",
            duration: 2000,
          });
        } else {
          console.error('❌ useChatMessageHandlers - Failed to save feedback to database');
          toast({
            description: "Failed to update feedback",
            duration: 2000,
            variant: "destructive"
          });
        }
      } else {
        console.log('⚠️ useChatMessageHandlers - No messageId provided, updating local state only. MessageId:', messageId);
        onFeedback(messageTimestamp, type);
        toast({
          description: `Feedback ${type === 'like' ? 'liked' : 'disliked'} (local only)`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('❌ useChatMessageHandlers - Error updating feedback:', error);
      toast({
        description: "Failed to update feedback",
        duration: 2000,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

  return {
    showCopiedTooltip,
    isUpdatingFeedback,
    handleCopy,
    handleFeedback
  };
};
