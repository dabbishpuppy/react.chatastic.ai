
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessages from "./ChatMessages";
import LoadingDots from "./LoadingDots";
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
  // Filter out lead form messages and handle them separately
  const regularMessages = chatHistory.filter(message => message.content !== "LEAD_FORM_WIDGET");
  const leadFormMessages = chatHistory.filter(message => message.content === "LEAD_FORM_WIDGET");

  return (
    <ScrollArea className="flex-1 px-4 py-2">
      <div className="space-y-4">
        {/* Render regular chat messages */}
        <ChatMessages
          chatHistory={regularMessages}
          isTyping={false}
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

        {/* Render lead forms inline where they appear in chat history */}
        {leadFormMessages.map((message, index) => {
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
        })}
        
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={agentName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  {agentName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${themeClasses.agentMessage}`}>
              <LoadingDots />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMainContent;
