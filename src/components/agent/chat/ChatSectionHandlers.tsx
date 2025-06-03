
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChatSectionState } from "./ChatSectionState";
import { ChatSectionHooks } from "./ChatSectionHooks";

interface MessageHandling {
  sendMessage: (content: string, messages: any[], onNewMessage: (message: any) => void) => Promise<void>;
  isAILoading: boolean;
}

export const useChatSectionHandlers = (
  state: ChatSectionState,
  hooks: ChatSectionHooks,
  messageHandling: MessageHandling
) => {
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    if (!state.inputValue.trim() || messageHandling.isAILoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: state.inputValue.trim(),
      isAgent: false,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    state.setMessages(prev => [...prev, userMessage]);
    state.setInputValue("");
    state.setHasUserSentMessage(true);

    try {
      // Send message to AI and get response
      await messageHandling.sendMessage(
        userMessage.content,
        state.messages,
        (responseMessage) => {
          state.setMessages(prev => [...prev, responseMessage]);
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
  }, [state.inputValue, state.messages, messageHandling, state.setMessages, state.setInputValue, state.setHasUserSentMessage, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    state.setInputValue(e.target.value);
  }, [state.setInputValue]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSuggestedMessageClick = useCallback((message: string) => {
    state.setInputValue(message);
    state.setHasUserSentMessage(true);
    
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      isAgent: false,
      timestamp: new Date().toISOString()
    };

    state.setMessages(prev => [...prev, userMessage]);

    // Send to AI
    messageHandling.sendMessage(
      message,
      state.messages,
      (responseMessage) => {
        state.setMessages(prev => [...prev, responseMessage]);
      }
    );
  }, [state, messageHandling]);

  const handleRegenerate = useCallback(async (messageIndex: number) => {
    if (messageIndex === 0 || messageHandling.isAILoading) return;

    const userMessage = state.messages[messageIndex - 1];
    if (!userMessage || userMessage.isAgent) return;

    // Remove the previous AI response
    const updatedMessages = state.messages.slice(0, messageIndex);
    state.setMessages(updatedMessages);

    try {
      // Regenerate response
      await messageHandling.sendMessage(
        userMessage.content,
        updatedMessages.slice(0, -1), // Exclude the user message we're regenerating for
        (responseMessage) => {
          state.setMessages(prev => [...prev, responseMessage]);
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
  }, [state.messages, messageHandling, state.setMessages, toast]);

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
    isLoading: messageHandling.isAILoading
  };
};

export type ChatSectionHandlers = ReturnType<typeof useChatSectionHandlers>;
