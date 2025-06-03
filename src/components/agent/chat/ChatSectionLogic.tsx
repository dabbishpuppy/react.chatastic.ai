
import React from "react";
import { ChatLayout } from "./ChatLayout";
import { useChatSectionState } from "./ChatSectionState";
import { useChatSectionHooks } from "./ChatSectionHooks";
import { useChatSectionHandlers } from "./ChatSectionHandlers";
import { useChatSectionEffects } from "./ChatSectionEffects";
import { ChatSectionProps } from "./ChatSectionProps";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useParams } from "react-router-dom";

const ChatSectionLogic: React.FC<ChatSectionProps> = (props) => {
  const { agentId } = useParams<{ agentId: string }>();
  const state = useChatSectionState(props);
  const hooks = useChatSectionHooks(state);
  const { sendMessage, isLoading: isAILoading } = useMessageHandling(agentId || '');
  
  const handlers = useChatSectionHandlers(state, hooks, {
    sendMessage,
    isAILoading
  });
  
  useChatSectionEffects(state, hooks);

  return <ChatLayout {...props} {...state} {...hooks} {...handlers} />;
};

export default ChatSectionLogic;
