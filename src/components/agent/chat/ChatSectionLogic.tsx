
import React from "react";
import { ChatLayout } from "./ChatLayout";
import { useChatSectionHooks } from "./ChatSectionHooks";
import { useChatSectionHandlers } from "./ChatSectionHandlers";
import { useChatSectionEffects } from "./ChatSectionEffects";
import { ChatSectionProps } from "./ChatSectionProps";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useParams } from "react-router-dom";

const ChatSectionLogic: React.FC<ChatSectionProps> = (props) => {
  const { agentId } = useParams<{ agentId: string }>();
  const state = useChatSectionHooks(props);
  const { sendMessage, isLoading: isAILoading } = useMessageHandling(agentId || '');
  
  const handlers = useChatSectionHandlers(state, {
    sendMessage,
    isLoading: isAILoading
  });
  
  useChatSectionEffects(
    props.isEmbedded || false,
    state.agentId,
    props.leadSettings,
    state.refreshSettings,
    state.effectiveLeadSettings,
    state.hasShownLeadForm,
    state.userHasMessaged,
    state.chatHistory,
    state.isTyping,
    state.setChatHistory,
    state.setHasShownLeadForm,
    state.scrollToBottom,
    state.currentConversation,
    state.setDisplayMessages,
    props.initialMessages || [],
    state.cleanup
  );

  return <ChatLayout {...props} state={state} handlers={handlers} />;
};

export default ChatSectionLogic;
