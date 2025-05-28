
import { getChatSectionHelpers } from "@/components/agent/chat/ChatSectionHelpers";

export const useChatDataComputed = (
  theme: 'light' | 'dark' | 'system',
  suggestedMessages: string[],
  userHasMessaged: boolean,
  showSuggestions: boolean,
  userMessageColor: string | null,
  isTyping: boolean,
  rateLimitError: string | null,
  isSubmitting: boolean
) => {
  const {
    themeClasses,
    shouldShowSuggestions,
    userMessageStyle,
    isInputDisabled,
    resolvedTheme
  } = getChatSectionHelpers(
    theme,
    suggestedMessages,
    userHasMessaged,
    showSuggestions,
    userMessageColor,
    isTyping,
    rateLimitError,
    isSubmitting
  );

  return {
    themeClasses,
    shouldShowSuggestions,
    userMessageStyle,
    isInputDisabled,
    resolvedTheme
  };
};
