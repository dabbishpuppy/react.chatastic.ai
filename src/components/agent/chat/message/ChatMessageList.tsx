
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chatInterface";
import ChatMessageComponent from "../ChatMessage";
import InlineLeadForm from "../InlineLeadForm";
import TypingChatMessageBubble from "./TypingChatMessageBubble";

interface ChatMessageListProps {
  chatHistory: ChatMessage[];
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
  themeClasses: any;
  userMessageStyle: any;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  leadSettings?: any;
  agentId?: string;
  conversationId?: string;
  theme?: 'light' | 'dark';
  onLeadFormSubmit?: () => void;
  isTyping?: boolean;
  isThinking?: boolean;
  typingMessageId?: string | null;
  onTypingComplete?: (messageId: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  chatHistory,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  onRegenerate,
  allowRegenerate = false,
  themeClasses,
  userMessageStyle,
  messagesEndRef,
  leadSettings,
  agentId,
  conversationId,
  theme = 'light',
  onLeadFormSubmit,
  isTyping,
  isThinking,
  typingMessageId,
  onTypingComplete
}) => {
  return (
    <div className="space-y-4">
      {/* Render messages in chronological order, replacing lead form widgets with actual forms */}
      {chatHistory.map((msg, index) => {
        if (msg.content === "LEAD_FORM_WIDGET") {
          // Render lead form inline at the correct position
          if (leadSettings && agentId) {
            return (
              <InlineLeadForm
                key={`lead-form-${index}`}
                agentId={agentId}
                conversationId={conversationId}
                title={leadSettings.title}
                collectName={leadSettings.collect_name}
                namePlaceholder={leadSettings.name_placeholder}
                collectEmail={leadSettings.collect_email}
                emailPlaceholder={leadSettings.email_placeholder}
                collectPhone={leadSettings.collect_phone}
                phonePlaceholder={leadSettings.phone_placeholder}
                onSubmit={onLeadFormSubmit || (() => {})}
                theme={theme}
              />
            );
          }
          return null;
        }
        
        // Check if this message is currently typing
        const isMessageTyping = msg.id === typingMessageId;
        
        if (isMessageTyping) {
          // Render message with typing effect
          return (
            <div key={`typing-${index}`} className="flex mb-4">
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
                  agentBubbleClass={themeClasses.agentMessage}
                  userBubbleClass={themeClasses.userMessage}
                  userMessageStyle={userMessageStyle}
                  isTyping={true}
                  onTypingComplete={() => onTypingComplete?.(msg.id || '')}
                />
              </div>
            </div>
          );
        }
        
        // Detect if this is the initial message - use same logic as other components
        const isInitialMessage = (index === 0 && msg.isAgent) || msg.id === 'initial-message';
        
        // Render regular message
        return (
          <ChatMessageComponent
            key={`message-${index}`}
            message={msg}
            agentName={agentName}
            profilePicture={profilePicture}
            showFeedback={showFeedback}
            hideUserAvatar={hideUserAvatar}
            onFeedback={onFeedback}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
            allowRegenerate={allowRegenerate}
            agentBubbleClass={themeClasses.agentMessage}
            userBubbleClass={themeClasses.userMessage}
            userMessageStyle={userMessageStyle}
            isInitialMessage={isInitialMessage}
            isLastAgentMessage={index === chatHistory.length - 1}
          />
        );
      })}
    </div>
  );
};

export default ChatMessageList;
