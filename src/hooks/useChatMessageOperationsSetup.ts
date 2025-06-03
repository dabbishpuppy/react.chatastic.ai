
import { useMessageOperations } from "@/hooks/useMessageOperations";
import { useMessageSubmission } from "@/hooks/useMessageSubmission";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import { ChatMessage } from "@/types/chatInterface";

interface UseChatMessageOperationsSetupProps {
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setUserHasMessaged: (value: boolean) => void;
  setIsTyping: (value: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  isEmbedded: boolean;
  conversationId?: string;
  startNewConversation: () => Promise<void>;
  currentConversation: any;
  setIsThinking: (value: boolean) => void;
  setTypingMessageId: (id: string | null) => void;
  setMessage: (message: string) => void;
  setRateLimitError: (error: string | null) => void;
  setTimeUntilReset: (time: number | null) => void;
}

export const useChatMessageOperationsSetup = ({
  setChatHistory,
  setUserHasMessaged,
  setIsTyping,
  inputRef,
  isEmbedded,
  conversationId,
  startNewConversation,
  currentConversation,
  setIsThinking,
  setTypingMessageId,
  setMessage,
  setRateLimitError,
  setTimeUntilReset
}: UseChatMessageOperationsSetupProps) => {
  // Set up submission state
  const submissionState = useSubmissionState();

  // Set up message operations with thinking and typing state setters
  const { proceedWithMessage } = useMessageOperations({
    setChatHistory,
    setUserHasMessaged,
    setIsTyping,
    inputRef,
    isEmbedded,
    conversationId,
    createConversationCallback: async () => {
      await startNewConversation();
      return currentConversation?.id || null;
    },
    setIsThinking,
    setTypingMessageId
  });

  // Set up message submission
  const { submitMessage } = useMessageSubmission({
    proceedWithMessage,
    setMessage,
    setRateLimitError,
    setTimeUntilReset,
    isSubmissionBlocked: submissionState.isSubmissionBlocked,
    recordSubmission: submissionState.recordSubmission,
    resetSubmission: submissionState.resetSubmission
  });

  return {
    submitMessage,
    isSubmitting: submissionState.isSubmitting
  };
};
