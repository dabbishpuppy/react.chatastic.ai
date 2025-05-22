
import React from "react";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { ChatInterfaceSettings } from "@/types/chatInterface";

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
  // Only render the preview if:
  // 1. We're on the embed tab
  // 2. The agent is public
  // 3. There's no visibility error
  // 4. Settings are available
  if (settings && tab === "embed" && visibility === "public" && !visibilityError) {
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
  
  return null;
};
