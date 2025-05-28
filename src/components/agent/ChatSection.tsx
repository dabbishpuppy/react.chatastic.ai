
import React from "react";
import ChatSectionLogic from "./chat/ChatSectionLogic";
import { ChatSectionProps } from "./chat/ChatSectionProps";

const ChatSection: React.FC<ChatSectionProps> = (props) => {
  return <ChatSectionLogic {...props} />;
};

export default ChatSection;
