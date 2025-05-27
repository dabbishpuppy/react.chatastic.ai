
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
                // Render regular message
                return (
                  <div key={`message-${item.index}`}>
                    {item.message.isAgent ? (
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
                          <div className="text-sm">
                            {item.message.content}
                          </div>
                          {showFeedback && (
                            <div className="flex items-center space-x-2 mt-2">
                              <button
                                onClick={() => onFeedback(item.message.timestamp, "like")}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                👍
                              </button>
                              <button
                                onClick={() => onFeedback(item.message.timestamp, "dislike")}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                👎
                              </button>
                              <button
                                onClick={() => onCopy(item.message.content)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Copy
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <div 
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${themeClasses.userMessage}`}
                          style={userMessageStyle}
                        >
                          <div className="text-sm">
                            {item.message.content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
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
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatMainContent;
