
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chatInterface";
import ChatMessageComponent from "./ChatMessage";
import ThinkingBubble from "./ThinkingBubble";
import SharedChatMessage from "./SharedChatMessage";
import TypingChatMessageBubble from "./message/TypingChatMessageBubble";

interface EnhancedChatMessagesProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  isThinking: boolean;
  typingMessageId: string | null;
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
  onTypingComplete?: (messageId: string) => void;
}

const EnhancedChatMessages: React.FC<EnhancedChatMessagesProps> = ({
  chatHistory,
  isTyping,
  isThinking,
  typingMessageId,
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
  messagesEndRef,
  onTypingComplete
}) => {
  // Find the last agent message index (excluding special messages like LEAD_FORM_WIDGET)
  const lastAgentMessageIndex = chatHistory.reduceRight((lastIndex, msg, index) => {
    return lastIndex === -1 && msg.isAgent && msg.content !== "LEAD_FORM_WIDGET" ? index : lastIndex;
  }, -1);

  return (
    <>
      {chatHistory.map((msg, idx) => {
        // Detect if this is the initial message
        const isInitialMessage = (idx === 0 && msg.isAgent) || msg.id === 'initial-message';
        const isMessageTyping = msg.id === typingMessageId;
        
        if (isMessageTyping) {
          // Render message with typing effect
          return (
            <div key={idx} className="flex mb-4">
              <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
                {profilePicture ? (
                  <AvatarImage src={profilePicture} alt={agentName} />
                ) : (
                  <AvatarFallback className="bg-gray-100" />
                )}
              </Avatar>
              <div className="flex flex-col max-w-[80%]">
                <TypingChatMessageBubble
                  content={msg.content}
                  isAgent={msg.isAgent}
                  agentBubbleClass={agentBubbleClass}
                  userBubbleClass={userBubbleClass}
                  userMessageStyle={userMessageStyle}
                  isTyping={true}
                  onTypingComplete={() => onTypingComplete?.(msg.id || '')}
                />
              </div>
            </div>
          );
        }
        
        return (
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
            isInitialMessage={isInitialMessage}
            isLastAgentMessage={idx === lastAgentMessageIndex}
          />
        );
      })}
      
      {/* Show thinking bubble when AI is thinking */}
      {isThinking && (
        <ThinkingBubble
          agentName={agentName}
          profilePicture={profilePicture}
          agentBubbleClass={agentBubbleClass}
        />
      )}
      
      {/* Legacy typing indicator for backward compatibility */}
      {isTyping && !isThinking && !typingMessageId && (
        <div className="flex mb-4">
          <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={agentName} />
            ) : (
              <AvatarFallback className="bg-gray-100" />
            )}
          </Avatar>
          <div className={`rounded-lg p-3 max-w-[80%] ${agentBubbleClass}`}>
            <div className="flex space-x-1 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "0ms"}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "300ms"}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "600ms"}}></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </>
  );
};

export default EnhancedChatMessages;
