
import { useState, useEffect, useCallback } from "react";
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
  const [localFeedback, setLocalFeedback] = useState<'like' | 'dislike' | undefined>(messageFeedback);

  // Update local feedback when prop changes (for real-time sync)
  useEffect(() => {
    setLocalFeedback(messageFeedback);
  }, [messageFeedback]);

  const handleCopy = useCallback(async (content: string) => {
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
      
      setTimeout(() => setShowCopiedTooltip(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [readOnly, onCopy]);

  const handleFeedback = useCallback(async (type: "like" | "dislike") => {
    if (isUpdatingFeedback || readOnly) return;

    console.log('🎯 useChatMessageHandlers - Handling feedback:', { 
      messageId, 
      messageTimestamp, 
      type, 
      currentLocalFeedback: localFeedback,
      hasMessageId: !!messageId,
      messageIdType: typeof messageId
    });

    setIsUpdatingFeedback(true);
    
    // Calculate new feedback value
    const newFeedback = localFeedback === type ? undefined : type;
    console.log('🔄 useChatMessageHandlers - New feedback value:', newFeedback);
    
    try {
      // Update local state for immediate UI response (optimistic update)
      setLocalFeedback(newFeedback);
      
      // Only try to save to database if we have a valid UUID messageId
      if (messageId && messageId !== 'initial-message' && isValidUUID(messageId)) {
        console.log('💾 useChatMessageHandlers - Saving feedback to database for message:', messageId, 'New feedback:', newFeedback);
        
        const success = await analyticsService.updateMessageFeedback(messageId, newFeedback || null);
        
        if (success) {
          console.log('✅ useChatMessageHandlers - Feedback saved to database successfully');
        } else {
          console.error('❌ useChatMessageHandlers - Failed to save feedback to database - REVERTING UI');
          
          // Revert the optimistic update if database save failed
          setLocalFeedback(localFeedback);
        }
      } else {
        // No valid messageId available - just use local state for UI feedback
        console.log('⚠️ useChatMessageHandlers - No valid messageId provided, using local state only. MessageId:', messageId);
      }
    } catch (error) {
      console.error('❌ useChatMessageHandlers - Error updating feedback - REVERTING UI:', error);
      
      // Revert the optimistic update if there was an error
      setLocalFeedback(localFeedback);
    } finally {
      setIsUpdatingFeedback(false);
    }
  }, [isUpdatingFeedback, readOnly, messageId, localFeedback]);

  return {
    showCopiedTooltip,
    isUpdatingFeedback,
    handleCopy,
    handleFeedback,
    currentFeedback: localFeedback // Return the local feedback state for immediate UI updates
  };
};

// Helper function to validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
