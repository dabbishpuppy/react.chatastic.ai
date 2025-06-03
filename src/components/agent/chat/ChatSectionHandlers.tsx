
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChatSectionState } from "./ChatSectionState";

interface MessageHandling {
  sendMessage: (
    content: string, 
    messages: any[], 
    onNewMessage: (message: any) => void,
    options?: {
      onThinkingStart?: () => void;
      onThinkingEnd?: () => void;
      onTypingStart?: (messageId: string) => void;
      onTypingComplete?: (messageId: string) => void;
    }
  ) => Promise<void>;
  isLoading: boolean;
}

export const useChatSectionHandlers = (
  state: ChatSectionState,
  messageHandling: MessageHandling
) => {
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    if (!state.message.trim() || messageHandling.isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: state.message.trim(),
      isAgent: false,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    state.setChatHistory(prev => [...prev, userMessage]);
    state.setMessage("");

    try {
      // Send message to AI with thinking and typing callbacks
      await messageHandling.sendMessage(
        userMessage.content,
        state.chatHistory,
        (responseMessage) => {
          state.setChatHistory(prev => [...prev, responseMessage]);
        },
        {
          onThinkingStart: () => {
            console.log('🤔 Handler: Starting thinking');
            state.setIsThinking(true);
            state.setTypingMessageId(null);
          },
          onThinkingEnd: () => {
            console.log('🤔 Handler: Ending thinking');
            state.setIsThinking(false);
          },
          onTypingStart: (messageId: string) => {
            console.log('⌨️ Handler: Starting typing for:', messageId);
            state.setTypingMessageId(messageId);
          },
          onTypingComplete: (messageId: string) => {
            console.log('✅ Handler: Typing complete for:', messageId);
            if (state.typingMessageId === messageId) {
              state.setTypingMessageId(null);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error in message handling:', error);
      state.setIsThinking(false);
      state.setTypingMessageId(null);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.message, state.chatHistory, messageHandling, state.setChatHistory, state.setMessage, state.setIsThinking, state.setTypingMessageId, state.typingMessageId, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    state.setMessage(e.target.value);
  }, [state.setMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSuggestedMessageClick = useCallback((message: string) => {
    state.setMessage(message);
    
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      isAgent: false,
      timestamp: new Date().toISOString()
    };

    state.setChatHistory(prev => [...prev, userMessage]);

    // Send to AI with thinking and typing callbacks
    messageHandling.sendMessage(
      message,
      state.chatHistory,
      (responseMessage) => {
        state.setChatHistory(prev => [...prev, responseMessage]);
      },
      {
        onThinkingStart: () => {
          state.setIsThinking(true);
          state.setTypingMessageId(null);
        },
        onThinkingEnd: () => {
          state.setIsThinking(false);
        },
        onTypingStart: (messageId: string) => {
          state.setTypingMessageId(messageId);
        },
        onTypingComplete: (messageId: string) => {
          if (state.typingMessageId === messageId) {
            state.setTypingMessageId(null);
          }
        }
      }
    );
  }, [state, messageHandling]);

  const handleRegenerate = useCallback(async (messageIndex: number) => {
    if (messageIndex === 0 || messageHandling.isLoading) return;

    const userMessage = state.chatHistory[messageIndex - 1];
    if (!userMessage || userMessage.isAgent) return;

    // Remove the previous AI response
    const updatedMessages = state.chatHistory.slice(0, messageIndex);
    state.setChatHistory(prev => updatedMessages);

    try {
      // Regenerate response with thinking and typing callbacks
      await messageHandling.sendMessage(
        userMessage.content,
        updatedMessages.slice(0, -1),
        (responseMessage) => {
          state.setChatHistory(prev => [...prev, responseMessage]);
        },
        {
          onThinkingStart: () => {
            state.setIsThinking(true);
            state.setTypingMessageId(null);
          },
          onThinkingEnd: () => {
            state.setIsThinking(false);
          },
          onTypingStart: (messageId: string) => {
            state.setTypingMessageId(messageId);
          },
          onTypingComplete: (messageId: string) => {
            if (state.typingMessageId === messageId) {
              state.setTypingMessageId(null);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error regenerating message:', error);
      state.setIsThinking(false);
      state.setTypingMessageId(null);
      toast({
        title: "Error",
        description: "Failed to regenerate message. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.chatHistory, messageHandling, state.setChatHistory, state.setIsThinking, state.setTypingMessageId, state.typingMessageId, toast]);

  const handleFeedback = useCallback((messageId: string, isPositive: boolean) => {
    console.log(`Feedback for message ${messageId}: ${isPositive ? 'positive' : 'negative'}`);
    toast({
      title: "Feedback recorded",
      description: "Thank you for your feedback!"
    });
  }, [toast]);

  return {
    handleSendMessage,
    handleInputChange,
    handleKeyPress,
    handleSuggestedMessageClick,
    handleRegenerate,
    handleFeedback,
    isLoading: messageHandling.isLoading
  };
};

export type ChatSectionHandlers = ReturnType<typeof useChatSectionHandlers>;
