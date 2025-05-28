
import React from 'react';
import ChatSection from '@/components/agent/ChatSection';
import { ChatInterfaceSettings } from '@/types/chatInterface';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatPreviewProps {
  draftSettings: ChatInterfaceSettings;
  hasUnsavedChanges: boolean;
  previewMessages: Array<{
    isAgent: boolean;
    content: string;
    timestamp: string;
  }>;
}

const ChatPreview: React.FC<ChatPreviewProps> = ({
  draftSettings,
  hasUnsavedChanges,
  previewMessages
}) => {
  // Get the current theme for proper styling (using draft settings)
  const currentTheme = draftSettings.theme || 'light';
  
  // Determine the header color based on sync settings (using draft settings)
  const headerColor = draftSettings.sync_colors ? draftSettings.user_message_color : null;

  return (
    <div className="w-full md:w-2/5 border-l">
      <div className="p-6 sticky top-0">
        <div className={`w-full max-w-md mx-auto h-[700px] rounded-lg shadow overflow-hidden flex flex-col ${
          currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}>
          <div className={`text-center py-2 text-sm border-b ${
            currentTheme === 'dark' ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <Avatar className="h-6 w-6">
                {draftSettings.profile_picture ? (
                  <AvatarImage src={draftSettings.profile_picture} alt={draftSettings.display_name} />
                ) : (
                  <AvatarFallback className="bg-gray-100 text-xs">
                    {draftSettings.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <span>Chat Preview {hasUnsavedChanges && <span className="text-yellow-600">(Draft)</span>}</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatSection 
              initialMessages={previewMessages}
              agentName={draftSettings.display_name}
              placeholder={draftSettings.message_placeholder}
              suggestedMessages={draftSettings.suggested_messages.map(msg => msg.text)}
              showSuggestions={draftSettings.show_suggestions_after_chat}
              showFeedback={draftSettings.show_feedback}
              allowRegenerate={draftSettings.allow_regenerate}
              theme={currentTheme}
              profilePicture={draftSettings.profile_picture || undefined}
              footer={draftSettings.footer || undefined}
              userMessageColor={draftSettings.user_message_color}
              headerColor={headerColor}
              hideUserAvatar={true}
            />
          </div>
        </div>
        
        {/* Chat bubble preview with black default */}
        <div className="mt-4 flex justify-end">
          <div 
            className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: draftSettings.bubble_color || "#000000" }}
          >
            {draftSettings.chat_icon ? (
              <img 
                src={draftSettings.chat_icon} 
                alt="Chat Icon"
                className="h-full w-full object-cover" 
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPreview;
