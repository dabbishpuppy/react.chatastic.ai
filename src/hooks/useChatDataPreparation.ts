
import { ChatSectionProps } from "@/components/agent/chat/ChatSectionProps";
import { useChatSectionEffects } from "@/components/agent/chat/ChatSectionEffects";
import { useChatDataProps } from "./useChatDataProps";
import { useChatDataHooks } from "./useChatDataHooks";
import { useChatDataHandlers } from "./useChatDataHandlers";
import { useChatDataComputed } from "./useChatDataComputed";

export const useChatDataPreparation = (props: ChatSectionProps) => {
  // Extract and normalize props
  const normalizedProps = useChatDataProps(props);

  // Get all hook data
  const hooks = useChatDataHooks(props);

  // Get handlers
  const handlers = useChatDataHandlers(props, hooks);

  // Apply all effects
  useChatSectionEffects(
    props.isEmbedded || false,
    hooks.agentId,
    props.leadSettings,
    hooks.refreshSettings,
    hooks.effectiveLeadSettings,
    hooks.hasShownLeadForm,
    hooks.userHasMessaged,
    hooks.chatHistory,
    hooks.isTyping,
    hooks.setChatHistory,
    hooks.setHasShownLeadForm,
    hooks.scrollToBottom,
    hooks.currentConversation,
    hooks.setDisplayMessages,
    props.initialMessages || [],
    hooks.cleanup
  );

  // Get computed values and styles
  const computed = useChatDataComputed(
    normalizedProps.theme,
    normalizedProps.suggestedMessages,
    hooks.userHasMessaged,
    normalizedProps.showSuggestions,
    normalizedProps.userMessageColor,
    hooks.isTyping,
    hooks.rateLimitError,
    hooks.isSubmitting
  );

  return {
    // Props
    ...normalizedProps,

    // Hook data
    ...hooks,

    // Handlers
    ...handlers,

    // Computed values
    ...computed
  };
};
