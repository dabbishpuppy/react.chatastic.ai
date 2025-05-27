
import React from "react";
import { ChatMessage } from "@/types/chatInterface";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessages from "./ChatMessages";
import LoadingDots from "./LoadingDots";
import InlineLeadForm from "./InlineLeadForm";

interface ChatMainContentProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (messageIndex: number, isPositive: boolean) => void;
  onCopy: (content: string) => void;
  themeClasses: any;
  userMessageStyle: React.CSSProperties;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  leadSettings?: any;
  agentId: string;
  conversationId?: string;
  theme: 'light' | 'dark';
  onLeadFormSubmit?: () => void;
  leadFormKey?: number;
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
  theme,
  onLeadFormSubmit,
  leadFormKey = 0
}) => {
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <ChatMessages
            messages={chatHistory}
            isTyping={isTyping}
            agentName={agentName}
            profilePicture={profilePicture}
            showFeedback={showFeedback}
            hideUserAvatar={hideUserAvatar}
            onFeedback={onFeedback}
            onCopy={onCopy}
            themeClasses={themeClasses}
            userMessageStyle={userMessageStyle}
            customMessageRenderer={(message, index) => {
              // Render lead form when message content is LEAD_FORM_WIDGET
              if (message.content === "LEAD_FORM_WIDGET" && leadSettings) {
                console.log('🎨 Rendering lead form widget with key:', leadFormKey);
                return (
                  <InlineLeadForm
                    key={`lead-form-${leadFormKey}`}
                    agentId={agentId}
                    conversationId={conversationId}
                    title={leadSettings.title || 'Get in touch with us'}
                    collectName={leadSettings.collect_name || false}
                    namePlaceholder={leadSettings.name_placeholder || 'Full name'}
                    collectEmail={leadSettings.collect_email || false}
                    emailPlaceholder={leadSettings.email_placeholder || 'Email'}
                    collectPhone={leadSettings.collect_phone || false}
                    phonePlaceholder={leadSettings.phone_placeholder || 'Phone'}
                    theme={theme}
                    onSubmit={() => {
                      console.log('📋 Lead form submitted');
                      onLeadFormSubmit?.();
                    }}
                  />
                );
              }
              return null;
            }}
          />
          
          {isTyping && (
            <div className="flex justify-start">
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${themeClasses.agentMessage}`}>
                <LoadingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatMainContent;
