
import { useState } from "react";
import { useChatSettings } from "@/hooks/useChatSettings";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { useChatState } from "@/hooks/useChatState";
import { useChatScroll } from "@/hooks/useChatScroll";
import { ChatMessage } from "@/types/chatInterface";

interface UseChatStateAndSettingsProps {
  agentId?: string;
  initialMessages?: ChatMessage[];
  isEmbedded?: boolean;
  leadSettings?: any;
}

export const useChatStateAndSettings = ({
  agentId,
  initialMessages,
  isEmbedded,
  leadSettings
}: UseChatStateAndSettingsProps) => {
  const { settings, refreshSettings } = useChatSettings();
  
  // Use the leadSettings from props if provided, otherwise use the hook
  const leadSettingsHook = useLeadSettings(agentId || '');
  const effectiveLeadSettings = leadSettings || leadSettingsHook.settings;
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);

  // Use actual chat state instead of dummy values
  const {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    setIsTyping,
    isThinking,
    setIsThinking,
    typingMessageId,
    setTypingMessageId,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    isWaitingForRateLimit,
    setIsWaitingForRateLimit,
    userHasMessaged,
    setUserHasMessaged,
    inputRef,
    countdownIntervalRef
  } = useChatState(initialMessages, isEmbedded);

  const { messagesEndRef, chatContainerRef, scrollToBottom } = useChatScroll(isEmbedded || false, chatHistory, isTyping);

  // Cleanup function
  const cleanup = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  return {
    hasShownLeadForm,
    setHasShownLeadForm,
    effectiveLeadSettings,
    refreshSettings: leadSettingsHook.refreshSettings,
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    setIsTyping,
    isThinking,
    setIsThinking,
    typingMessageId,
    setTypingMessageId,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    userHasMessaged,
    setUserHasMessaged,
    inputRef,
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    cleanup
  };
};
