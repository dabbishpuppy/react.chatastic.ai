
import React, { useState, useEffect } from "react";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { ChatInterfaceSettings } from "@/types/chatInterface";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatbotPreviewProps {
  settings: ChatInterfaceSettings;
  tab: string;
  visibility: string;
  visibilityError: boolean;
}

export const ChatbotPreview: React.FC<ChatbotPreviewProps> = ({ 
  settings, 
  tab, 
  visibility, 
  visibilityError 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Set loading to false when settings are available
    if (settings) {
      setIsLoading(false);
    }
  }, [settings]);

  // Only render the preview if:
  // 1. We're on the embed tab
  // 2. The agent is public
  // 3. There's no visibility error
  // 4. Settings are available
  if (tab === "embed" && visibility === "public" && !visibilityError) {
    if (isLoading) {
      return (
        <div className="w-full h-[500px] flex items-center justify-center">
          <Skeleton className="w-80 h-80 rounded-lg" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="w-full h-[500px] flex items-center justify-center">
          <p className="text-red-500">Error loading preview: {error}</p>
        </div>
      );
    }
    
    if (settings) {
      return (
        <ChatbotWidget 
          productName="Your Website"
          botName={settings.display_name}
          primaryColor="#000000"
          showPopups={true}
          theme={settings.theme}
          bubblePosition={settings.bubble_position}
          autoShowDelay={settings.auto_show_delay}
          showFeedback={settings.show_feedback}
          allowRegenerate={settings.allow_regenerate}
          initialMessage={settings.initial_message}
          suggestedMessages={settings.suggested_messages.map(msg => msg.text)}
          showSuggestions={settings.show_suggestions_after_chat}
          messagePlaceholder={settings.message_placeholder}
          footer={settings.footer}
          chatIcon={settings.chat_icon}
          profilePicture={settings.profile_picture}
        />
      );
    }
  }
  
  return null;
};
