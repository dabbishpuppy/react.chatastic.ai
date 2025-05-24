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
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  
  // Conversation management
  const {
    currentConversation,
    conversationEnded,
    agentId,
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
        agentId={agentId}
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
    </ChatContainer>
  );
};

export default ChatSection;
