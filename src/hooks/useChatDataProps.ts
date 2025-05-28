
import { ChatSectionProps } from "@/components/agent/chat/ChatSectionProps";

export const useChatDataProps = (props: ChatSectionProps) => {
  const {
    agentName = "AI Customer Service",
    placeholder = "Write message here...",
    suggestedMessages = [],
    showSuggestions = true,
    showFeedback = true,
    allowRegenerate = true,
    theme = 'light',
    profilePicture,
    chatIcon,
    footer,
    footerClassName = "",
    userMessageColor = null,
    headerColor = null,
    hideUserAvatar = false,
    toggleSettings
  } = props;

  return {
    agentName,
    placeholder,
    suggestedMessages,
    showSuggestions,
    showFeedback,
    allowRegenerate,
    theme,
    profilePicture,
    chatIcon,
    footer,
    footerClassName,
    userMessageColor,
    headerColor,
    hideUserAvatar,
    toggleSettings
  };
};
