
import React, { useEffect, useState } from "react";
import { ChatMessage } from "@/types/chatInterface";
import ChatHeader from "./chat/ChatHeader";
import ChatMainContent from "./chat/ChatMainContent";
import ChatFooter from "./chat/ChatFooter";
import ChatContainer from "./chat/ChatContainer";
import LeadFormWidget from "./chat/LeadFormWidget";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { getThemeClasses, getContrastColor } from "./chat/ThemeConfig";
import { useConversationManager } from "@/hooks/useConversationManager";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { useParams } from "react-router-dom";

interface ChatSectionProps {
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
}

const ChatSection: React.FC<ChatSectionProps> = ({ 
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
}) => {
  const { agentId } = useParams();
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);
  
  // Load lead settings
  const { settings: leadSettings } = useLeadSettings(agentId || '');
  
  // Conversation management
  const {
    currentConversation,
    conversationEnded,
    agentId: conversationAgentId,
    startNewConversation,
    endCurrentConversation,
    loadConversation,
    saveMessage,
    getConversationMessages
  } = useConversationManager(isEmbedded ? 'iframe' : 'bubble');

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

  const { messagesEndRef, chatContainerRef } = useChatScroll(isEmbedded, chatHistory, isTyping);

  const {
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponse);

  // Check if we should show the lead form
  useEffect(() => {
    if (
      isEmbedded && 
      leadSettings?.enabled && 
      !hasShownLeadForm && 
      userHasMessaged &&
      chatHistory.length >= 2 && // At least one user message and one AI response
      !isTyping
    ) {
      // Small delay to ensure the AI response is fully rendered
      const timer = setTimeout(() => {
        setShowLeadForm(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isEmbedded, leadSettings?.enabled, hasShownLeadForm, userHasMessaged, chatHistory.length, isTyping]);

  // Enhanced message submission with conversation saving
  const handleSubmitWithConversation = async (e: React.FormEvent) => {
    if (!message.trim() || isTyping || rateLimitError) return;
    
    const messageText = message.trim();
    
    // Save user message
    if (currentConversation) {
      await saveMessage(messageText, false);
    }
    
    // Handle the submission - simplified for embedded mode
    await handleSubmitWithAgentId(e);
    
    // Save agent response (this would be called after the agent responds)
    // For now, we'll save a placeholder response
    setTimeout(async () => {
      if (currentConversation) {
        await saveMessage("Agent response placeholder", true);
      }
    }, 1000);
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

  const handleLeadFormSubmit = () => {
    setShowLeadForm(false);
    setHasShownLeadForm(true);
  };

  const handleLeadFormClose = () => {
    setShowLeadForm(false);
    setHasShownLeadForm(true);
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
        agentId={conversationAgentId}
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

      {/* Lead Form Widget */}
      {showLeadForm && leadSettings && (
        <LeadFormWidget
          agentId={agentId || ''}
          conversationId={currentConversation?.id}
          title={leadSettings.title}
          collectName={leadSettings.collect_name}
          namePlaceholder={leadSettings.name_placeholder}
          collectEmail={leadSettings.collect_email}
          emailPlaceholder={leadSettings.email_placeholder}
          collectPhone={leadSettings.collect_phone}
          phonePlaceholder={leadSettings.phone_placeholder}
          onSubmit={handleLeadFormSubmit}
          onClose={handleLeadFormClose}
          theme={resolvedTheme}
        />
      )}
    </ChatContainer>
  );
};

export default ChatSection;
