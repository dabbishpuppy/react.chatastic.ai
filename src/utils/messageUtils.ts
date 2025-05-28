import { ChatMessage } from "@/types/chatInterface";
import { messageService } from "@/services/messageService";
import { conversationService } from "@/services/conversationService";

// Track recent messages to prevent duplicates - expanded to 2 seconds
const recentMessages = new Map<string, number>();

// Clean up old entries every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentMessages.entries()) {
    if (now - timestamp > 2000) { // Remove entries older than 2 seconds
      recentMessages.delete(key);
    }
  }
}, 30000);

const isDuplicateMessage = (content: string, conversationId?: string): boolean => {
  const key = `${conversationId || 'no-conv'}-${content.trim()}`;
  const now = Date.now();
  const lastSubmitted = recentMessages.get(key);
  
  if (lastSubmitted && now - lastSubmitted < 2000) { // Expanded to 2 second window
    console.log('🚫 Client-side duplicate detected:', {
      content: content.substring(0, 50) + '...',
      timeSinceLastMessage: now - lastSubmitted,
      conversationId
    });
    return true;
  }
  
  recentMessages.set(key, now);
  return false;
};

// Helper function to ensure conversation exists before saving messages
const ensureConversationExists = async (agentId?: string, source: 'iframe' | 'bubble' = 'iframe'): Promise<string | null> => {
  if (!agentId) {
    console.warn('⚠️ No agentId provided for conversation creation');
    return null;
  }

  try {
    // Generate a session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🆕 Creating conversation for message with agentId:', agentId, 'source:', source);
    
    const conversation = await conversationService.createConversation(agentId, sessionId, source);
    
    if (conversation) {
      console.log('✅ Conversation created successfully:', conversation.id);
      return conversation.id;
    } else {
      console.error('❌ Failed to create conversation');
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    return null;
  }
};

export const proceedWithMessage = async (
  text: string,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setUserHasMessaged: (value: boolean) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  isEmbedded: boolean = false,
  conversationId?: string,
  agentId?: string,
  source: 'iframe' | 'bubble' = 'iframe'
) => {
  const trimmedText = text.trim();
  
  console.log('📤 Processing user message:', {
    content: trimmedText.substring(0, 50) + '...',
    conversationId,
    agentId,
    source,
    isEmbedded
  });
  
  // Check for duplicate message
  if (isDuplicateMessage(trimmedText, conversationId)) {
    console.log('🚫 Duplicate message detected, skipping:', trimmedText.substring(0, 50) + '...');
    return;
  }

  const userMessage: ChatMessage = {
    content: trimmedText,
    isAgent: false,
    timestamp: new Date().toISOString(),
  };

  // Ensure conversation exists if we don't have one
  let activeConversationId = conversationId;
  if (!activeConversationId && agentId) {
    console.log('🆕 No conversation ID, creating new conversation');
    activeConversationId = await ensureConversationExists(agentId, source);
    
    if (!activeConversationId) {
      console.error('❌ Failed to create conversation, cannot save messages');
      // Still add message to UI for user experience
      setChatHistory(prev => [...prev, userMessage]);
      setUserHasMessaged(true);
      setIsTyping(true);
      
      // Simulate AI response without saving
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          content: "I'm sorry, there was an issue starting the conversation. Please try refreshing the page.",
          isAgent: true,
          timestamp: new Date().toISOString(),
        };
        setChatHistory(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1000);
      return;
    }
  }

  // Save user message to database if conversation exists
  if (activeConversationId) {
    console.log('💾 Saving user message to conversation:', activeConversationId);
    const savedUserMessage = await messageService.saveMessage(activeConversationId, trimmedText, false);
    if (savedUserMessage) {
      userMessage.id = savedUserMessage.id;
      console.log('✅ User message saved with ID:', savedUserMessage.id);
    } else {
      console.error('❌ Failed to save user message to database');
    }
  }

  // Add user message immediately to UI
  setChatHistory(prev => {
    console.log('📝 Adding user message to chat history UI');
    return [...prev, userMessage];
  });
  setUserHasMessaged(true);
  setIsTyping(true);

  // Simulate AI response after a delay
  setTimeout(async () => {
    const aiResponseText = "Thank you for your message! This is a simulated response.";
    
    // Check for duplicate AI response with expanded window
    const aiKey = `${activeConversationId || 'no-conv'}-ai-${aiResponseText}`;
    const now = Date.now();
    const lastAiResponse = recentMessages.get(aiKey);
    
    if (lastAiResponse && now - lastAiResponse < 2000) { // Expanded to 2 second window for AI responses
      console.log('🚫 Duplicate AI response detected, skipping');
      setIsTyping(false);
      return;
    }
    
    recentMessages.set(aiKey, now);
    
    const aiMessage: ChatMessage = {
      content: aiResponseText,
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

    // Save AI message to database if conversation exists
    if (activeConversationId) {
      console.log('💾 Saving AI response to conversation:', activeConversationId);
      const savedAiMessage = await messageService.saveMessage(activeConversationId, aiResponseText, true);
      if (savedAiMessage) {
        aiMessage.id = savedAiMessage.id;
        console.log('✅ AI response saved successfully with ID:', savedAiMessage.id);
      } else {
        console.error('❌ Failed to save AI response to database');
      }
    } else {
      console.warn('⚠️ No conversation ID available for saving AI response');
    }

    setChatHistory(prev => {
      console.log('🤖 Adding AI response to chat history UI');
      return [...prev, aiMessage];
    });
    setIsTyping(false);

    // Focus input field after response
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, 1000 + Math.random() * 1000);
};

export const copyMessageToClipboard = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    console.log('Message copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy message: ', err);
  });
};

export const handleFeedback = async (
  timestamp: string,
  type: "like" | "dislike",
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  messageId?: string
) => {
  // Update local state immediately for responsiveness
  setChatHistory(prev => 
    prev.map(msg => {
      if (msg.timestamp === timestamp) {
        const newFeedback = msg.feedback === type ? undefined : type;
        
        // Update database if message has an ID
        if (msg.id) {
          messageService.updateMessageFeedback(msg.id, newFeedback || null);
        }
        
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    })
  );
  
  console.log(`Feedback ${type} for message at ${timestamp}`);
};

export const regenerateResponse = async (
  allowRegenerate: boolean,
  chatHistory: ChatMessage[],
  isTyping: boolean,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  conversationId?: string
) => {
  if (!allowRegenerate || isTyping || chatHistory.length === 0) return;

  // Find the last AI message using reverse iteration
  let lastAiMessageIndex = -1;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    if (chatHistory[i].isAgent && chatHistory[i].content !== "LEAD_FORM_WIDGET") {
      lastAiMessageIndex = i;
      break;
    }
  }
  
  if (lastAiMessageIndex === -1) return;

  // Remove the last AI message
  setChatHistory(prev => prev.slice(0, lastAiMessageIndex));
  setIsTyping(true);

  // Generate a new response
  setTimeout(async () => {
    const newResponseText = "This is a regenerated response with different content.";
    const newAiMessage: ChatMessage = {
      content: newResponseText,
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

    // Save regenerated message to database if conversation exists
    if (conversationId) {
      const savedMessage = await messageService.saveMessage(conversationId, newResponseText, true);
      if (savedMessage) {
        newAiMessage.id = savedMessage.id;
      }
    }

    setChatHistory(prev => [...prev, newAiMessage]);
    setIsTyping(false);

    // Focus input field after regeneration
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, 1000 + Math.random() * 1000);
};

export const insertEmoji = (
  emoji: string,
  isTyping: boolean,
  rateLimitError: string | null,
  setMessage: (update: (prev: string) => string) => void,
  inputRef: React.RefObject<HTMLInputElement>
) => {
  if (isTyping || rateLimitError) return;
  
  setMessage(prev => prev + emoji);
  
  // Focus input field after emoji insertion
  setTimeout(() => {
    inputRef.current?.focus();
  }, 10);
};
