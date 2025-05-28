
import { useState, useEffect, useCallback } from "react";
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
  }, [readOnly, onCopy]);

  const handleFeedback = useCallback(async (type: "like" | "dislike") => {
    if (isUpdatingFeedback || !messageTimestamp || readOnly) return;

    // 🎯 IMMEDIATE UI FEEDBACK - Update local state first for instant visual response
    const newFeedback = localFeedback === type ? undefined : type;
    console.log('🚀 Immediate UI Update - Setting local feedback to:', newFeedback);
    setLocalFeedback(newFeedback);

    setIsUpdatingFeedback(true);
    
    try {
      console.log('🔥 useChatMessageHandlers - Handling feedback:', { 
        messageId, 
        messageTimestamp, 
        type, 
        currentLocalFeedback: localFeedback,
        newFeedback,
        hasMessageId: !!messageId,
        messageIdType: typeof messageId
      });
      
      // If we have a messageId, save to database
      if (messageId && messageId !== 'initial-message') {
        console.log('💾 useChatMessageHandlers - Saving feedback to database for message:', messageId, 'New feedback:', newFeedback);
        
        const success = await analyticsService.updateMessageFeedback(messageId, newFeedback || null);
        
        if (success) {
          console.log('✅ useChatMessageHandlers - Feedback saved to database successfully');
          
          toast({
            description: newFeedback ? `Feedback ${type === 'like' ? 'liked' : 'disliked'}` : "Feedback removed",
            duration: 2000,
          });
        } else {
          console.error('❌ useChatMessageHandlers - Failed to save feedback to database - REVERTING UI');
          
          // Revert the optimistic update if database save failed
          setLocalFeedback(localFeedback);
          
          toast({
            description: "Failed to update feedback",
            duration: 2000,
            variant: "destructive"
          });
        }
      } else {
        // No messageId available, use local state only via onFeedback callback
        console.log('⚠️ useChatMessageHandlers - No messageId provided, updating local state only. MessageId:', messageId);
        
        if (onFeedback) {
          onFeedback(messageTimestamp, type);
        }
        
        toast({
          description: `Feedback ${type === 'like' ? 'liked' : 'disliked'} (local only)`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('❌ useChatMessageHandlers - Error updating feedback - REVERTING UI:', error);
      
      // Revert the optimistic update if there was an error
      setLocalFeedback(localFeedback);
      
      toast({
        description: "Failed to update feedback",
        duration: 2000,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingFeedback(false);
    }
  }, [isUpdatingFeedback, messageTimestamp, readOnly, messageId, localFeedback, onFeedback]);

  return {
    showCopiedTooltip,
    isUpdatingFeedback,
    handleCopy,
    handleFeedback,
    currentFeedback: localFeedback // Return the local feedback state for immediate UI updates
  };
};
