
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
  console.log('📋 EmbeddedChat - settings:', settings);
  console.log('📋 EmbeddedChat - leadSettings:', leadSettings);
  console.log('🔄 EmbeddedChat - isLoading:', isLoading);
  console.log('👁️ EmbeddedChat - agentVisibility:', agentVisibility);
  
  // Get URL parameters for theme and colors if present
  const themeParam = searchParams.get('theme');
  const userColorParam = searchParams.get('userColor');
  const headerColorParam = searchParams.get('headerColor');

  // Use URL parameters if provided, otherwise use settings from database with fallbacks
  const theme = themeParam || settings?.theme || 'light';
  const userMessageColor = userColorParam || settings?.user_message_color || '#3B82F6';
  
  // For header color:
  // 1. Use headerColorParam if provided in URL
  // 2. If not in URL but sync is enabled, use user message color
  // 3. Otherwise, use null to get default white header
  const headerColor = headerColorParam || 
    (settings?.sync_colors ? (settings?.user_message_color || '#3B82F6') : null);

  // Use custom hooks for embedded functionality
  useEmbeddedStyles();
  useEmbeddedResizeObserver(containerRef, agentId);
  useEmbeddedMessageHandler(agentId, refreshSettings);

  // Show loading while either settings or visibility are loading
  if (isLoading || visibilityLoading) {
    console.log('⏳ EmbeddedChat - Still loading, showing loading component');
    return <EmbeddedChatLoading />;
  }

  // If agent is private, show an error message
  if (agentVisibility === "private") {
    console.log('🚫 EmbeddedChat - Agent is private, showing error');
    return <PrivateAgentError />;
  }

  // If settings failed to load completely, show error
  if (!settings) {
    console.error('❌ EmbeddedChat - Settings failed to load');
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Unable to Load Chat</h2>
          <p className="text-gray-600">
            Failed to load chat settings. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ EmbeddedChat - Rendering ChatSection with settings:', {
    agentId,
    displayName: settings.display_name || 'AI Assistant',
    initialMessage: settings.initial_message || '👋 Hi! How can I help you today?',
    theme,
    userMessageColor,
    headerColor
  });

  // Create initial messages with fallback
  const initialMessages = [{
    isAgent: true,
    content: settings.initial_message || '👋 Hi! How can I help you today?',
    timestamp: new Date().toISOString()
  }];

  // Use the chat settings from the agent with fallbacks
  return (
    <div className="embedded-chat-container" ref={containerRef}>
      <div className="w-full h-full flex flex-col">
        <ChatSection 
          agentId={agentId}
          initialMessages={initialMessages}
          agentName={settings.display_name || 'AI Assistant'}
          placeholder={settings.message_placeholder || 'Write message here...'}
          suggestedMessages={(settings.suggested_messages || []).map(msg => msg.text)}
          showSuggestions={settings.show_suggestions_after_chat !== undefined ? settings.show_suggestions_after_chat : true}
          showFeedback={settings.show_feedback !== undefined ? settings.show_feedback : true}
          allowRegenerate={settings.allow_regenerate !== undefined ? settings.allow_regenerate : true}
          theme={theme as 'light' | 'dark' | 'system'}
          profilePicture={settings.profile_picture || undefined}
          footer={settings.footer || undefined}
          isEmbedded={true}
          userMessageColor={userMessageColor}
          headerColor={headerColor}
          hideUserAvatar={true}
          leadSettings={leadSettings}
        />
      </div>
    </div>
  );
};

export default EmbeddedChat;
