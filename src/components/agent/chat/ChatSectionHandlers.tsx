
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChatSectionState } from "./ChatSectionState";

interface MessageHandling {
  sendMessage: (content: string, messages: any[], onNewMessage: (message: any) => void) => Promise<void>;
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
      // Send message to AI and get response
      await messageHandling.sendMessage(
        userMessage.content,
        state.chatHistory,
        (responseMessage) => {
          state.setChatHistory(prev => [...prev, responseMessage]);
        }
      );
    } catch (error) {
      console.error('Error in message handling:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.message, state.chatHistory, messageHandling, state.setChatHistory, state.setMessage, toast]);

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

    // Send to AI
    messageHandling.sendMessage(
      message,
      state.chatHistory,
      (responseMessage) => {
        state.setChatHistory(prev => [...prev, responseMessage]);
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
      // Regenerate response
      await messageHandling.sendMessage(
        userMessage.content,
        updatedMessages.slice(0, -1), // Exclude the user message we're regenerating for
        (responseMessage) => {
          state.setChatHistory(prev => [...prev, responseMessage]);
        }
      );
    } catch (error) {
      console.error('Error regenerating message:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate message. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.chatHistory, messageHandling, state.setChatHistory, toast]);

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
