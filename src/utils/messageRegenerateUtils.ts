
import { ChatMessage } from "@/types/chatInterface";
import { messageService } from "@/services/messageService";

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
