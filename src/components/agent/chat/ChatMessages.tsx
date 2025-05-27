
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chatInterface";
import ChatMessageComponent from "./ChatMessage";
import LoadingDots from "./LoadingDots";

interface ChatMessagesProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle: React.CSSProperties;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatHistory,
  isTyping,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  onRegenerate,
  allowRegenerate = false,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle,
  messagesEndRef
}) => {
  // Find the last agent message index (excluding special messages like LEAD_FORM_WIDGET)
  const lastAgentMessageIndex = chatHistory.reduceRight((lastIndex, msg, index) => {
    return lastIndex === -1 && msg.isAgent && msg.content !== "LEAD_FORM_WIDGET" ? index : lastIndex;
  }, -1);

  return (
    <>
      {chatHistory.map((msg, idx) => (
        <ChatMessageComponent
          key={idx}
          message={msg}
          agentName={agentName}
          profilePicture={profilePicture}
          showFeedback={showFeedback}
          hideUserAvatar={hideUserAvatar}
          onFeedback={onFeedback}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          allowRegenerate={allowRegenerate}
          agentBubbleClass={agentBubbleClass}
          userBubbleClass={userBubbleClass}
          userMessageStyle={userMessageStyle}
          isInitialMessage={idx === 0 && msg.isAgent}
          isLastAgentMessage={idx === lastAgentMessageIndex}
        />
      ))}
      
      {isTyping && (
        <div className="flex mb-4">
          <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={agentName} />
            ) : (
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {agentName.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className={`rounded-lg p-3 max-w-[80%] ${agentBubbleClass}`}>
            <LoadingDots />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </>
  );
};

export default ChatMessages;
