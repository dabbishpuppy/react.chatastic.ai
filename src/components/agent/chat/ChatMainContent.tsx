
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessages from "./ChatMessages";
import InlineLeadForm from "./InlineLeadForm";
import { ChatMessage } from "@/types/chatInterface";

interface ChatMainContentProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  themeClasses: any;
  userMessageStyle: any;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  leadSettings?: any;
  agentId?: string;
  conversationId?: string;
  theme?: 'light' | 'dark';
  onLeadFormSubmit?: () => void;
}

const ChatMainContent: React.FC<ChatMainContentProps> = ({
  chatHistory,
  isTyping,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  themeClasses,
  userMessageStyle,
  messagesEndRef,
  leadSettings,
  agentId,
  conversationId,
  theme = 'light',
  onLeadFormSubmit
}) => {
  // Process messages to render them in order, including lead forms
  const processedMessages = chatHistory.map((message, index) => {
    if (message.content === "LEAD_FORM_WIDGET") {
      return {
        type: 'lead-form',
        message,
        index
      };
    }
    return {
      type: 'message',
      message,
      index
    };
  });

  // Filter out lead form messages for the ChatMessages component
  const regularMessages = chatHistory.filter(msg => msg.content !== "LEAD_FORM_WIDGET");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 overflow-auto">
        <div className="px-4 py-2 min-h-full">
          <div className="space-y-4">
            {/* Render all messages and lead forms in chronological order */}
            {processedMessages.map((item) => {
              if (item.type === 'lead-form') {
                // Render lead form inline
                if (leadSettings && agentId) {
                  return (
                    <InlineLeadForm
                      key={`lead-form-${item.index}`}
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
              } else {
                // Check if this message should be rendered by looking at its position
                const messageIndex = regularMessages.findIndex(msg => 
                  msg.timestamp === item.message.timestamp && 
                  msg.content === item.message.content
                );
                
                // Only render if this is the first occurrence of this message in regular messages
                if (messageIndex !== -1) {
                  const isLastMessage = messageIndex === regularMessages.length - 1;
                  
                  return (
                    <div key={`message-${item.index}-${item.message.timestamp}`}>
                      <ChatMessages
                        chatHistory={[item.message]}
                        isTyping={isLastMessage ? isTyping : false}
                        agentName={agentName}
                        profilePicture={profilePicture}
                        showFeedback={showFeedback}
                        hideUserAvatar={hideUserAvatar}
                        onFeedback={onFeedback}
                        onCopy={onCopy}
                        agentBubbleClass={themeClasses.agentMessage}
                        userBubbleClass={themeClasses.userMessage}
                        userMessageStyle={userMessageStyle}
                        messagesEndRef={messagesEndRef}
                      />
                    </div>
                  );
                }
                return null;
              }
            })}
            
            {/* Show typing indicator only if not already shown above */}
            {isTyping && regularMessages.length === 0 && (
              <ChatMessages
                chatHistory={[]}
                isTyping={true}
                agentName={agentName}
                profilePicture={profilePicture}
                showFeedback={showFeedback}
                hideUserAvatar={hideUserAvatar}
                onFeedback={onFeedback}
                onCopy={onCopy}
                agentBubbleClass={themeClasses.agentMessage}
                userBubbleClass={themeClasses.userMessage}
                userMessageStyle={userMessageStyle}
                messagesEndRef={messagesEndRef}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatMainContent;
