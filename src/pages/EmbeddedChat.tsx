
import React, { useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";
import EmbeddedChatLoading from "@/components/agent/chat/EmbeddedChatLoading";
import PrivateAgentError from "@/components/agent/chat/PrivateAgentError";
import AgentNotFoundError from "@/components/agent/chat/AgentNotFoundError";
import { useEmbeddedStyles } from "@/hooks/useEmbeddedStyles";
import { useEmbeddedResizeObserver } from "@/hooks/useEmbeddedResizeObserver";
import { useEmbeddedMessageHandler } from "@/hooks/useEmbeddedMessageHandler";
import { useAgentVisibility } from "@/hooks/useAgentVisibility";
import { useAgentExists } from "@/hooks/useAgentExists";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { settings, leadSettings, isLoading, refreshSettings } = useChatSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const { agentVisibility, visibilityLoading } = useAgentVisibility(agentId);
  const { agentExists, isLoading: agentExistsLoading } = useAgentExists(agentId);
  
  console.log('🎯 EmbeddedChat - agentId from params:', agentId);
  console.log('📋 EmbeddedChat - settings:', settings);
  console.log('📋 EmbeddedChat - leadSettings:', leadSettings);
  console.log('🔄 EmbeddedChat - isLoading:', isLoading);
  console.log('👁️ EmbeddedChat - agentVisibility:', agentVisibility);
  console.log('🔍 EmbeddedChat - agentExists:', agentExists);
  
  // Get URL parameters for theme and colors if present
  const themeParam = searchParams.get('theme');
  const userColorParam = searchParams.get('userColor');
  const headerColorParam = searchParams.get('headerColor');

  // Use URL parameters if provided, otherwise use settings from database with fallbacks
  const theme = themeParam || settings?.theme || 'light';
  const userMessageColor = userColorParam || settings?.user_message_color || '#000000';
  
  // For header color:
  // 1. Use headerColorParam if provided in URL
  // 2. If not in URL but sync is enabled, use user message color
  // 3. Otherwise, use null to get default white header
  const headerColor = headerColorParam || 
    (settings?.sync_colors ? (settings?.user_message_color || '#000000') : null);

  // Enhanced source detection - check multiple indicators
  const detectConversationSource = (): 'iframe' | 'bubble' => {
    // Check if we're in an iframe
    const isInIframe = window !== window.top;
    
    // Check for bubble-specific URL parameters or identifiers
    const isBubbleMode = searchParams.get('mode') === 'bubble' || 
                        searchParams.get('widget') === 'true' ||
                        window.location.pathname.includes('/bubble') ||
                        document.referrer.includes('wonderwave-bubble');
    
    // Check for iframe-specific indicators  
    const isIframeMode = searchParams.get('mode') === 'iframe' ||
                        window.location.pathname.includes('/iframe') ||
                        isInIframe;
    
    console.log('🔍 EmbeddedChat - Enhanced source detection:', {
      isInIframe,
      isBubbleMode,
      isIframeMode,
      searchParams: Object.fromEntries(searchParams),
      pathname: window.location.pathname,
      referrer: document.referrer,
      windowTop: window.top,
      currentWindow: window
    });
    
    // Priority logic: bubble mode takes precedence if explicitly set
    if (isBubbleMode && !isIframeMode) {
      console.log('✅ Detected as BUBBLE widget');
      return 'bubble';
    }
    
    // Default to iframe if in iframe context or explicitly set
    if (isIframeMode || isInIframe) {
      console.log('✅ Detected as IFRAME');
      return 'iframe';
    }
    
    // Fallback: assume iframe for embedded contexts
    console.log('⚠️ Using fallback detection as IFRAME');
    return 'iframe';
  };

  const conversationSource = detectConversationSource();
  
  console.log('🎯 EmbeddedChat - Final conversation source:', conversationSource);

  // Use custom hooks for embedded functionality
  useEmbeddedStyles();
  useEmbeddedResizeObserver(containerRef, agentId);
  useEmbeddedMessageHandler(agentId, refreshSettings);

  // Show loading while any of the checks are loading
  if (isLoading || visibilityLoading || agentExistsLoading) {
    console.log('⏳ EmbeddedChat - Still loading, showing loading component');
    return <EmbeddedChatLoading />;
  }

  // If agent doesn't exist, show error message
  if (agentExists === false) {
    console.log('❌ EmbeddedChat - Agent does not exist, showing error');
    return <AgentNotFoundError />;
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
    headerColor,
    conversationSource
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
          conversationSource={conversationSource}
        />
      </div>
    </div>
  );
};

export default EmbeddedChat;
