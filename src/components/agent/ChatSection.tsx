
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
  agentId?: string; // Add agentId as optional prop
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
  agentId: propAgentId, // Rename to avoid confusion
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
  const { agentId: paramAgentId } = useParams();
  // Use prop agentId if provided, otherwise fall back to URL param
  const agentId = propAgentId || paramAgentId;
  
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);
  
  // Load lead settings
  const { settings: leadSettings } = useLeadSettings(agentId || '');
  
  // Add debug logging for lead settings
  useEffect(() => {
    console.log('Lead settings loaded:', {
      agentId,
      leadSettings,
      isEmbedded,
      enabled: leadSettings?.enabled
    });
  }, [agentId, leadSettings, isEmbedded]);
  
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

  // Enhanced lead form trigger logic with debug logging
  useEffect(() => {
    console.log('Lead form trigger check:', {
      isEmbedded,
      leadSettingsEnabled: leadSettings?.enabled,
      hasShownLeadForm,
      userHasMessaged,
      chatHistoryLength: chatHistory.length,
      isTyping,
      shouldTrigger: isEmbedded && 
        leadSettings?.enabled && 
        !hasShownLeadForm && 
        userHasMessaged &&
        chatHistory.length >= 1 && // Reduced from 2 to 1
        !isTyping
    });

    if (
      isEmbedded && 
      leadSettings?.enabled && 
      !hasShownLeadForm && 
      userHasMessaged &&
      chatHistory.length >= 1 && // Reduced requirement to just 1 message (user message)
      !isTyping
    ) {
      console.log('Triggering lead form...');
      // Shorter delay for better UX
      const timer = setTimeout(() => {
        setShowLeadForm(true);
        console.log('Lead form shown');
      }, 500); // Reduced from 1000ms
      
      return () => clearTimeout(timer);
    }
  }, [isEmbedded, leadSettings?.enabled, hasShownLeadForm, userHasMessaged, chatHistory.length, isTyping]);

  // Enhanced message submission with proper conversation and lead form management
  const handleSubmitWithConversation = async (e: React.FormEvent) => {
    if (!message.trim() || isTyping || rateLimitError) return;
    
    const messageText = message.trim();
    console.log('Submitting message with conversation:', messageText);
    
    // Create conversation if it doesn't exist (for embedded mode)
    if (isEmbedded && !currentConversation && agentId) {
      console.log('Creating conversation for first message in embedded mode');
      await startNewConversation();
    }
    
    // Save user message to conversation
    if (currentConversation) {
      console.log('Saving user message to conversation');
      await saveMessage(messageText, false);
    }
    
    // Handle the submission
    await handleSubmitWithAgentId(e);
    
    // After AI response is generated, save it too
    // This needs to be done after the message utils complete the AI response
    setTimeout(async () => {
      if (currentConversation && chatHistory.length > 0) {
        const lastMessage = chatHistory[chatHistory.length - 1];
        if (lastMessage && lastMessage.isAgent) {
          console.log('Saving AI response to conversation');
          await saveMessage(lastMessage.content, true);
        }
      }
    }, 2000); // Wait for AI response to be added to chat history
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
    console.log('Lead form submitted');
    setShowLeadForm(false);
    setHasShownLeadForm(true);
  };

  const handleLeadFormClose = () => {
    console.log('Lead form closed');
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
