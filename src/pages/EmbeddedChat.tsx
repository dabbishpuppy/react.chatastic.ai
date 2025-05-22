
import React from "react";
import { useParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { settings, isLoading } = useChatSettings();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Use the chat settings from the agent
  return (
    <div className="w-full h-screen flex flex-col">
      <ChatSection 
        initialMessages={[{
          isAgent: true,
          content: settings.initial_message,
          timestamp: new Date().toISOString()
        }]}
        agentName={settings.display_name}
        placeholder={settings.message_placeholder}
        suggestedMessages={settings.suggested_messages.map(msg => msg.text)}
        showSuggestions={settings.show_suggestions_after_chat}
        showFeedback={settings.show_feedback}
        allowRegenerate={settings.allow_regenerate}
        theme={settings.theme}
        profilePicture={settings.profile_picture || undefined}
        chatIcon={settings.chat_icon || undefined}
        footer={settings.footer || undefined}
      />
    </div>
  );
};

export default EmbeddedChat;
