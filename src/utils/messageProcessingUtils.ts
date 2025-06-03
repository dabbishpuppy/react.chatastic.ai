
import { ChatMessage } from "@/types/chatInterface";
import { messageService } from "@/services/messageService";
import { isDuplicateMessage, isDuplicateAIResponse } from "./duplicateMessageUtils";
import { RAGChatIntegration } from "@/services/rag/ui/ragChatIntegration";

export const proceedWithMessage = async (
  text: string,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setUserHasMessaged: (value: boolean) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  isEmbedded: boolean = false,
  conversationId: string,
  setIsThinking?: (value: boolean) => void,
  setTypingMessageId?: (id: string | null) => void
) => {
  const trimmedText = text.trim();
  
  console.log('📤 Processing user message with RAG integration:', {
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
  
  // Show thinking bubble immediately after user message
  if (setIsThinking) {
    console.log('🤔 Setting thinking state to true');
    setIsThinking(true);
  }

  try {
    // Extract agent ID from conversation or URL
    const agentId = await getAgentIdFromConversation(conversationId);
    
    if (!agentId) {
      throw new Error('Agent ID not found for conversation');
    }

    console.log('🧠 Processing message with RAG system for agent:', agentId);
    
    // Thinking delay (1.5 seconds to show thinking dots)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Hide thinking bubble before processing
    if (setIsThinking) {
      console.log('🤔 Setting thinking state to false');
      setIsThinking(false);
    }
    
    // Process with RAG integration
    const ragResult = await RAGChatIntegration.processMessageWithRAG(
      trimmedText,
      agentId,
      conversationId,
      {
        enableRAG: true,
        maxSources: 5,
        enableStreaming: false
      }
    );

    console.log('🎯 RAG processing complete:', {
      responseLength: ragResult.response.length,
      sourcesUsed: ragResult.processingMetadata?.sourcesUsed || 0,
      processingTime: ragResult.processingMetadata?.totalTime || 0
    });

    // Check for duplicate AI response
    if (isDuplicateAIResponse(ragResult.response, conversationId)) {
      if (setIsThinking) {
        setIsThinking(false);
      }
      setIsTyping(false);
      return;
    }
    
    // Generate unique ID for the AI message
    const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      content: ragResult.response,
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

    // Save AI message to database
    console.log('💾 Saving AI response to conversation:', conversationId);
    const savedAiMessage = await messageService.saveMessage(conversationId, ragResult.response, true);
    if (savedAiMessage) {
      aiMessage.id = savedAiMessage.id;
      console.log('✅ AI response saved successfully with ID:', savedAiMessage.id);
    } else {
      console.error('❌ Failed to save AI response to database');
    }

    // Start typing animation
    if (setTypingMessageId) {
      console.log('⌨️ Setting typing message ID:', aiMessage.id);
      setTypingMessageId(aiMessage.id);
    }

    setChatHistory(prev => {
      console.log('🤖 Adding RAG-powered AI response to chat history UI with typing animation');
      return [...prev, aiMessage];
    });

    // Simulate typing completion based on content length
    setTimeout(() => {
      console.log('✅ Typing animation complete for message:', aiMessage.id);
      if (setTypingMessageId) {
        setTypingMessageId(null);
      }
      setIsTyping(false);
    }, ragResult.response.length * 30 + 1000); // ~30ms per character + 1s buffer

    // Focus input field after response
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

  } catch (error) {
    console.error('❌ RAG processing failed, falling back to error message:', error);
    
    // Hide thinking bubble on error
    if (setIsThinking) {
      setIsThinking(false);
    }
    
    // Check for duplicate AI response even for error message
    const errorResponseText = "I apologize, but I encountered an issue processing your request. Please try again or contact support if the problem persists.";
    
    if (isDuplicateAIResponse(errorResponseText, conversationId)) {
      setIsTyping(false);
      return;
    }
    
    // Generate unique ID for the error message
    const errorMessageId = `ai-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const errorMessage: ChatMessage = {
      id: errorMessageId,
      content: errorResponseText,
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

    // Save error message to database
    const savedErrorMessage = await messageService.saveMessage(conversationId, errorResponseText, true);
    if (savedErrorMessage) {
      errorMessage.id = savedErrorMessage.id;
    }

    if (setTypingMessageId) {
      setTypingMessageId(errorMessage.id);
    }

    setChatHistory(prev => [...prev, errorMessage]);

    // Simulate typing for error message
    setTimeout(() => {
      if (setTypingMessageId) {
        setTypingMessageId(null);
      }
      setIsTyping(false);
    }, 2000);

    // Focus input field after error response
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }
};

// Helper function to extract agent ID from conversation
async function getAgentIdFromConversation(conversationId: string): Promise<string | null> {
  try {
    // First try to get agent ID from URL params
    const urlPath = window.location.pathname;
    const agentIdMatch = urlPath.match(/\/agent\/([^\/]+)/);
    
    if (agentIdMatch && agentIdMatch[1]) {
      console.log('🎯 Agent ID found from URL:', agentIdMatch[1]);
      return agentIdMatch[1];
    }

    // If not found in URL, try to get from conversation data
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('agent_id')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('❌ Error fetching conversation agent ID:', error);
      return null;
    }

    if (conversation?.agent_id) {
      console.log('🎯 Agent ID found from conversation:', conversation.agent_id);
      return conversation.agent_id;
    }

    console.error('❌ Agent ID not found');
    return null;
  } catch (error) {
    console.error('❌ Error extracting agent ID:', error);
    return null;
  }
}
