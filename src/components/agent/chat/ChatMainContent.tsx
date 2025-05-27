
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
  onRegenerate,
  allowRegenerate = false,
  themeClasses,
  userMessageStyle,
  messagesEndRef,
  leadSettings,
  agentId,
  conversationId,
  theme = 'light',
  onLeadFormSubmit
}) => {
  // Separate regular messages from lead form widgets
  const regularMessages = chatHistory.filter(msg => msg.content !== "LEAD_FORM_WIDGET");
  const leadFormMessages = chatHistory.filter(msg => msg.content === "LEAD_FORM_WIDGET");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 overflow-auto">
        <div className="px-4 py-2 min-h-full">
          <div className="space-y-4">
            {/* Render all regular messages using ChatMessages component */}
            <ChatMessages
              chatHistory={regularMessages}
              isTyping={isTyping}
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
              messagesEndRef={messagesEndRef}
            />
            
            {/* Render lead forms inline */}
            {leadFormMessages.map((leadMsg, index) => {
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatMainContent;
