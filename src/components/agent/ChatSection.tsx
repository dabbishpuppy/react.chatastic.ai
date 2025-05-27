import React, { useEffect, useState } from "react";
import { ChatMessage } from "@/types/chatInterface";
import ChatHeader from "./chat/ChatHeader";
import ChatMainContent from "./chat/ChatMainContent";
import ChatFooter from "./chat/ChatFooter";
import ChatContainer from "./chat/ChatContainer";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { getThemeClasses, getContrastColor } from "./chat/ThemeConfig";
import { useConversationManager } from "@/hooks/useConversationManager";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { useParams } from "react-router-dom";

interface ChatSectionProps {
  agentId?: string;
  initialMessages?: ChatMessage[];
  toggleSettings?: () => void;
  agentName?: string;
  placeholder?: string;
  suggestedMessages?: string[];
  showSuggestions?: boolean;
  showFeedback?: boolean;
  allowRegenerate?: boolean;
  theme?: 'light' | 'dark' | 'system';
  profilePicture?: string;
  chatIcon?: string;
  footer?: string | null;
  footerClassName?: string;
  isEmbedded?: boolean;
  userMessageColor?: string | null;
  headerColor?: string | null;
  hideUserAvatar?: boolean;
  leadSettings?: any; // Lead settings from props (for embedded mode)
  conversationSource?: 'iframe' | 'bubble'; // New prop to specify the source
}

const ChatSection: React.FC<ChatSectionProps> = ({ 
  agentId: propAgentId,
  initialMessages = [], 
  toggleSettings,
  agentName = "AI Customer Service",
  placeholder = "Write message here...",
  suggestedMessages = [],
  showSuggestions = true,
  showFeedback = true,
  allowRegenerate = true,
  theme = 'light',
  profilePicture,
  chatIcon,
  footer,
  footerClassName = "",
  isEmbedded = false,
  userMessageColor = null,
  headerColor = null,
  hideUserAvatar = false,
  leadSettings: propLeadSettings = null,
  conversationSource = 'iframe', // Default to iframe for backward compatibility
}) => {
  const { agentId: paramAgentId } = useParams();
  const agentId = propAgentId || paramAgentId;
  
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);
  
  // Load lead settings - use prop leadSettings if available (for embedded mode), otherwise use hook
  const { settings: hookLeadSettings, refreshSettings } = useLeadSettings(agentId || '');
  const effectiveLeadSettings = propLeadSettings || hookLeadSettings;
  
  console.log('📋 ChatSection - Using lead settings:', {
    propLeadSettings,
    hookLeadSettings,
    effectiveLeadSettings,
    isEmbedded,
    conversationSource
  });
  
  // Enhanced refresh logic for embedded mode with immediate updates
  useEffect(() => {
    if (isEmbedded && agentId) {
      console.log('🔄 Setting up enhanced settings refresh for embedded mode');
      
      // If using hook (fallback), refresh it
      if (!propLeadSettings) {
        refreshSettings();
        
        // Faster refresh interval for embedded mode (1 second instead of 2)
        const interval = setInterval(() => {
          console.log('⏰ Periodic settings refresh for embedded mode');
          refreshSettings();
        }, 1000);
        
        // Listen for settings update messages with immediate response
        const handleMessage = (event: MessageEvent) => {
          console.log('📨 Received message in ChatSection:', event.data);
          
          if (event.data && (
            event.data.type === 'lead-settings-updated' || 
            event.data.type === 'wonderwave-refresh-settings'
          ) && event.data.agentId === agentId) {
            console.log('📋 Received lead settings update message, triggering immediate refresh...');
            
            // Multiple immediate refreshes to ensure update
            refreshSettings();
            setTimeout(() => refreshSettings(), 100);
            setTimeout(() => refreshSettings(), 500);
            setTimeout(() => refreshSettings(), 1000);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        return () => {
          clearInterval(interval);
          window.removeEventListener('message', handleMessage);
        };
      }
    }
  }, [isEmbedded, agentId, refreshSettings, propLeadSettings]);
  
  console.log('🔍 ChatSection - Using conversation source:', conversationSource);
  
  // Conversation management with the correct source
  const {
    currentConversation,
    conversationEnded,
    agentId: conversationAgentId,
    startNewConversation,
    endCurrentConversation,
    loadConversation,
    saveMessage,
    getConversationMessages
  } = useConversationManager(conversationSource);

  const {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    rateLimitError,
    timeUntilReset,
    isWaitingForRateLimit,
    userHasMessaged,
    inputRef,
    handleSubmit,
    handleSuggestedMessageClick,
    copyMessageToClipboard,
    handleFeedback,
    regenerateResponse,
    insertEmoji,
    handleCountdownFinished,
    cleanup
  } = useMessageHandling(displayMessages, isEmbedded);

  const { messagesEndRef, chatContainerRef, scrollToBottom } = useChatScroll(isEmbedded, chatHistory, isTyping);

  const {
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponse);

  // Enhanced debug logging for lead form with more detailed tracking
  useEffect(() => {
    console.log('🔍 LEAD FORM DEBUG STATE:', {
      agentId,
      isEmbedded,
      leadSettingsLoaded: !!effectiveLeadSettings,
      leadSettingsEnabled: effectiveLeadSettings?.enabled,
      collectName: effectiveLeadSettings?.collect_name,
      collectEmail: effectiveLeadSettings?.collect_email,
      collectPhone: effectiveLeadSettings?.collect_phone,
      hasShownLeadForm,
      userHasMessaged,
      chatHistoryLength: chatHistory.length,
      isTyping,
      title: effectiveLeadSettings?.title,
      leadSettingsObject: effectiveLeadSettings
    });
  }, [agentId, isEmbedded, effectiveLeadSettings, hasShownLeadForm, userHasMessaged, chatHistory.length, isTyping]);

  // Enhanced lead form trigger logic with better field validation and scroll trigger
  useEffect(() => {
    if (!isEmbedded || !effectiveLeadSettings?.enabled || hasShownLeadForm || !userHasMessaged || isTyping) {
      return;
    }

    // Check if at least one field is enabled
    const hasAnyFields = effectiveLeadSettings.collect_name || effectiveLeadSettings.collect_email || effectiveLeadSettings.collect_phone;
    if (!hasAnyFields) {
      console.log('🚫 No lead form fields enabled, skipping form display');
      return;
    }

    // Count user messages and AI responses
    const userMessages = chatHistory.filter(msg => !msg.isAgent && msg.content !== "LEAD_FORM_WIDGET");
    const aiMessages = chatHistory.filter(msg => msg.isAgent && msg.content !== "LEAD_FORM_WIDGET");
    
    console.log('🚀 LEAD FORM TRIGGER CHECK:', {
      userMessagesCount: userMessages.length,
      aiMessagesCount: aiMessages.length,
      shouldTrigger: userMessages.length >= 1 && aiMessages.length >= 1,
      hasAnyFields,
      enabledFields: {
        name: effectiveLeadSettings.collect_name,
        email: effectiveLeadSettings.collect_email,
        phone: effectiveLeadSettings.collect_phone
      }
    });

    // Show lead form after first user message AND first AI response
    if (userMessages.length >= 1 && aiMessages.length >= 1) {
      console.log('✅ TRIGGERING LEAD FORM NOW - Adding to chat');
      const timer = setTimeout(() => {
        // Add lead form message to chat history instead of showing popup
        const leadFormMessage: ChatMessage = {
          isAgent: true,
          content: "LEAD_FORM_WIDGET",
          timestamp: new Date().toISOString()
        };
        
        setChatHistory(prev => {
          const newHistory = [...prev, leadFormMessage];
          
          // Trigger enhanced scroll after lead form is added
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          
          return newHistory;
        });
        setHasShownLeadForm(true);
        console.log('📋 LEAD FORM ADDED TO CHAT');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isEmbedded, effectiveLeadSettings?.enabled, effectiveLeadSettings?.collect_name, effectiveLeadSettings?.collect_email, effectiveLeadSettings?.collect_phone, effectiveLeadSettings?.title, hasShownLeadForm, userHasMessaged, chatHistory, isTyping, setChatHistory, scrollToBottom]);

  // Enhanced message submission with proper conversation and lead form management
  const handleSubmitWithConversation = async (e: React.FormEvent) => {
    if (!message.trim() || isTyping || rateLimitError) return;
    
    const messageText = message.trim();
    console.log('📤 Submitting message:', messageText);
    
    // Handle the submission first (this adds user message to chatHistory)
    await handleSubmitWithAgentId(e);
    
    // Create conversation if it doesn't exist (for embedded mode)
    if (isEmbedded && !currentConversation && agentId) {
      console.log('🆕 Creating conversation for embedded mode with source:', conversationSource);
      await startNewConversation();
    }
    
    // Save user message to conversation
    if (currentConversation || isEmbedded) {
      console.log('💾 Saving user message to conversation');
      await saveMessage(messageText, false);
    }
  };

  const handleStartNewChat = async () => {
    await startNewConversation();
    setChatHistory([{
      isAgent: true,
      content: initialMessages[0]?.content || "Hi! I'm Wonder AI. How can I help you today?",
      timestamp: new Date().toISOString()
    }]);
    setHasShownLeadForm(false);
  };

  const handleEndChat = async () => {
    await endCurrentConversation();
  };

  const handleLoadConversation = async (conversationId: string) => {
    await loadConversation(conversationId);
    const messages = await getConversationMessages(conversationId);
    if (messages.length > 0) {
      setChatHistory(messages);
      setDisplayMessages(messages);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Update chat when initialMessages prop changes
  useEffect(() => {
    if (initialMessages.length > 0 && !currentConversation) {
      setDisplayMessages(initialMessages);
      setChatHistory(initialMessages);
    }
  }, [initialMessages, currentConversation, setChatHistory]);

  // Apply theme based on settings
  const themeClasses = getThemeClasses(theme);

  // Should we show suggested messages?
  const shouldShowSuggestions = suggestedMessages.length > 0 && (!userHasMessaged || showSuggestions);

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Check if input should be disabled - only for rate limit and typing, not conversation ended
  const isInputDisabled = isTyping || !!rateLimitError;

  // Convert 'system' theme to 'light' or 'dark' for components that don't support 'system'
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? 'light' : theme;

  return (
    <ChatContainer
      isEmbedded={isEmbedded}
      themeClasses={themeClasses}
      chatContainerRef={chatContainerRef}
    >
      {/* Chat Header */}
      <ChatHeader
        agentName={agentName}
        profilePicture={profilePicture}
        allowRegenerate={allowRegenerate}
        toggleSettings={toggleSettings}
        onRegenerate={() => handleRegenerateWithAgentId(allowRegenerate)}
        headerColor={headerColor}
        backgroundColor={themeClasses.background}
        iconButtonClass={themeClasses.iconButton}
        onStartNewChat={handleStartNewChat}
        onEndChat={handleEndChat}
        onLoadConversation={handleLoadConversation}
        agentId={agentId || ''}
        isConversationEnded={conversationEnded}
        isEmbedded={isEmbedded}
      />

      {/* Chat Messages - Scrollable area */}
      <ChatMainContent
        chatHistory={chatHistory}
        isTyping={isTyping}
        agentName={agentName}
        profilePicture={profilePicture}
        showFeedback={showFeedback}
        hideUserAvatar={hideUserAvatar}
        onFeedback={handleFeedback}
        onCopy={copyMessageToClipboard}
        themeClasses={themeClasses}
        userMessageStyle={userMessageStyle}
        messagesEndRef={messagesEndRef}
        leadSettings={effectiveLeadSettings}
        agentId={agentId || ''}
        conversationId={currentConversation?.id}
        theme={resolvedTheme}
        onLeadFormSubmit={() => {
          console.log('📋 Lead form submitted from chat integration');
          // Remove the lead form message from chat and add any new messages that were pending
          setChatHistory(prev => {
            const filteredHistory = prev.filter(msg => msg.content !== "LEAD_FORM_WIDGET");
            console.log('📋 Chat history after lead form removal:', filteredHistory);
            return filteredHistory;
          });
        }}
      />

      {/* Fixed footer section */}
      <ChatFooter
        rateLimitError={rateLimitError}
        timeUntilReset={timeUntilReset}
        onCountdownFinished={handleCountdownFinished}
        shouldShowSuggestions={shouldShowSuggestions}
        suggestedMessages={suggestedMessages}
        handleSuggestedMessageClick={handleSuggestedMessageClickWithAgentId}
        isInputDisabled={isInputDisabled}
        theme={theme}
        themeClasses={themeClasses}
        message={message}
        setMessage={setMessage}
        onSubmit={handleSubmitWithConversation}
        placeholder={placeholder}
        inputRef={inputRef}
        chatIcon={chatIcon}
        isEmbedded={isEmbedded}
        footer={footer}
        footerClassName={footerClassName}
        onEmojiInsert={insertEmoji}
        isConversationEnded={conversationEnded}
        onStartNewChat={handleStartNewChat}
      />
    </ChatContainer>
  );
};

export default ChatSection;
