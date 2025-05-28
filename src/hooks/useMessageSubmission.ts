
import { checkRateLimit, recordMessage } from "@/utils/rateLimitUtils";

interface UseMessageSubmissionProps {
  proceedWithMessage: (text: string) => Promise<void>;
  setMessage: (message: string) => void;
  setRateLimitError: (error: string | null) => void;
  setTimeUntilReset: (time: number | null) => void;
  isSubmissionBlocked: (text: string) => boolean;
  recordSubmission: (text: string) => void;
  resetSubmission: () => void;
}

export const useMessageSubmission = ({
  proceedWithMessage,
  setMessage,
  setRateLimitError,
  setTimeUntilReset,
  isSubmissionBlocked,
  recordSubmission,
  resetSubmission
}: UseMessageSubmissionProps) => {

  // Enhanced message submission with stronger deduplication
  const submitMessage = async (text: string, agentId?: string) => {
    const trimmedText = text.trim();
    
    if (isSubmissionBlocked(trimmedText)) {
      return;
    }

    console.log('📤 Starting message submission:', {
      text: trimmedText.substring(0, 50) + '...',
      agentId
    });

    recordSubmission(trimmedText);
    
    try {
      // Clear input immediately
      setMessage("");
      
      // Check rate limit if agentId is provided
      if (agentId) {
        const rateLimitStatus = await checkRateLimit(agentId);
        
        if (rateLimitStatus.exceeded) {
          console.log('🚫 Rate limit exceeded');
          setRateLimitError(rateLimitStatus.message || 'Too many messages in a row');
          if (rateLimitStatus.timeUntilReset) {
            setTimeUntilReset(rateLimitStatus.timeUntilReset);
          }
          return;
        }
        
        // Record the message
        await recordMessage(agentId);
      }
      
      // Add message to chat and proceed (this will handle the database save)
      await proceedWithMessage(trimmedText);
      
      console.log('✅ Message submission completed successfully');
    } catch (error) {
      console.error('❌ Error during message submission:', error);
    } finally {
      resetSubmission();
    }
  };

  return {
    submitMessage
  };
};
