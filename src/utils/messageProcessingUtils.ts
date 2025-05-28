
import { ChatMessage } from "@/types/chatInterface";
import { messageService } from "@/services/messageService";
import { isDuplicateMessage, isDuplicateAIResponse } from "./duplicateMessageUtils";

export const proceedWithMessage = async (
  text: string,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setUserHasMessaged: (value: boolean) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  isEmbedded: boolean = false,
  conversationId: string // Now required, no longer optional
) => {
  const trimmedText = text.trim();
  
  console.log('📤 Processing user message with conversation ID:', {
    content: trimmedText.substring(0, 50) + '...',
    conversationId,
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

  // Save user message to database
  console.log('💾 Saving user message to conversation:', conversationId);
  const savedUserMessage = await messageService.saveMessage(conversationId, trimmedText, false);
  if (savedUserMessage) {
    userMessage.id = savedUserMessage.id;
    console.log('✅ User message saved with ID:', savedUserMessage.id);
  } else {
    console.error('❌ Failed to save user message to database');
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
    if (isDuplicateAIResponse(aiResponseText, conversationId)) {
      setIsTyping(false);
      return;
    }
    
    const aiMessage: ChatMessage = {
      content: aiResponseText,
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

    // Save AI message to database
    console.log('💾 Saving AI response to conversation:', conversationId);
    const savedAiMessage = await messageService.saveMessage(conversationId, aiResponseText, true);
    if (savedAiMessage) {
      aiMessage.id = savedAiMessage.id;
      console.log('✅ AI response saved successfully with ID:', savedAiMessage.id);
    } else {
      console.error('❌ Failed to save AI response to database');
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
