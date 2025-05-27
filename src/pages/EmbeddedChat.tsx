
import React, { useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";
import EmbeddedChatLoading from "@/components/agent/chat/EmbeddedChatLoading";
import PrivateAgentError from "@/components/agent/chat/PrivateAgentError";
import { useEmbeddedStyles } from "@/hooks/useEmbeddedStyles";
import { useEmbeddedResizeObserver } from "@/hooks/useEmbeddedResizeObserver";
import { useEmbeddedMessageHandler } from "@/hooks/useEmbeddedMessageHandler";
import { useAgentVisibility } from "@/hooks/useAgentVisibility";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { settings, leadSettings, isLoading, refreshSettings } = useChatSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const { agentVisibility, visibilityLoading } = useAgentVisibility(agentId);
  
  console.log('🎯 EmbeddedChat - agentId from params:', agentId);
  console.log('📋 EmbeddedChat - leadSettings:', leadSettings);
  
  // Get URL parameters for theme and colors if present
  const themeParam = searchParams.get('theme');
  const userColorParam = searchParams.get('userColor');
  const headerColorParam = searchParams.get('headerColor');

  // Use URL parameters if provided, otherwise use settings from database
  const theme = themeParam || settings?.theme;
  const userMessageColor = userColorParam || settings?.user_message_color;
  
  // For header color:
  // 1. Use headerColorParam if provided in URL
  // 2. If not in URL but sync is enabled, use user message color
  // 3. Otherwise, use null to get default white header
  const headerColor = headerColorParam || 
    (settings?.sync_colors ? settings?.user_message_color : null);

  // Use custom hooks for embedded functionality
  useEmbeddedStyles();
  useEmbeddedResizeObserver(containerRef, agentId);
  useEmbeddedMessageHandler(agentId, refreshSettings);

  if (isLoading || visibilityLoading) {
    return <EmbeddedChatLoading />;
  }

  // If agent is private, show an error message
  if (agentVisibility === "private") {
    return <PrivateAgentError />;
  }

  // Use the chat settings from the agent but don't pass the chat icon
  return (
    <div className="embedded-chat-container" ref={containerRef}>
      <div className="w-full h-full flex flex-col">
        <ChatSection 
          agentId={agentId} // Pass agentId as prop
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
          theme={theme as 'light' | 'dark' | 'system'}
          profilePicture={settings.profile_picture || undefined}
          footer={settings.footer || undefined}
          isEmbedded={true}
          userMessageColor={userMessageColor}
          headerColor={headerColor}
          hideUserAvatar={true} // Always hide user avatar in embedded chat
          leadSettings={leadSettings} // Pass lead settings from Edge Function
        />
      </div>
    </div>
  );
};

export default EmbeddedChat;
