
import React from "react";
import { ConversationMessage } from "@/services/conversationLoader";
import SharedChatMessage from "@/components/agent/chat/SharedChatMessage";

interface ConversationMessagesProps {
  messages: ConversationMessage[];
  isLoading: boolean;
  displayName: string;
  profilePicture?: string;
  userMessageColor?: string;
  theme: 'light' | 'dark';
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
}

const ConversationMessages: React.FC<ConversationMessagesProps> = ({
  messages,
  isLoading,
  displayName,
  profilePicture,
  userMessageColor,
  theme,
  onFeedback,
  onCopy
}) => {
  // Find the last agent message index for regenerate button
  const lastAgentMessageIndex = messages.reduceRight((lastIndex, msg, index) => {
    return lastIndex === -1 && msg.role === 'assistant' && msg.id !== 'initial-message' ? index : lastIndex;
  }, -1);

  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: '#ffffff'
  } : {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No messages in this conversation
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <SharedChatMessage
          key={message.id || index}
          message={message}
          agentName={displayName}
          profilePicture={profilePicture}
          showFeedback={true}
          hideUserAvatar={false}
          readOnly={false}
          onFeedback={onFeedback}
          onCopy={onCopy}
          allowRegenerate={false}
          agentBubbleClass={theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'}
          userBubbleClass="bg-blue-500 text-white ml-auto"
          userMessageStyle={userMessageStyle}
          isLastAgentMessage={index === lastAgentMessageIndex}
          theme={theme}
        />
      ))}
    </div>
  );
};

export default ConversationMessages;
