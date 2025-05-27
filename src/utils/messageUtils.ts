import { ChatMessage } from "@/types/chatInterface";

export const proceedWithMessage = (
  text: string,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setUserHasMessaged: (value: boolean) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  isEmbedded: boolean = false
) => {
  const userMessage: ChatMessage = {
    content: text,
    isAgent: false,
    timestamp: new Date().toISOString(),
  };

  // Add user message immediately
  setChatHistory(prev => {
    console.log('📝 Adding user message to chat history');
    return [...prev, userMessage];
  });
  setUserHasMessaged(true);
  setIsTyping(true);

  // Simulate AI response after a delay
  setTimeout(() => {
    const aiMessage: ChatMessage = {
      content: "Thank you for your message! This is a simulated response.",
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

    setChatHistory(prev => {
      console.log('🤖 Adding AI response to chat history');
      // DO NOT filter out lead form widgets - keep them in the history
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

export const handleFeedback = (
  timestamp: string,
  type: "like" | "dislike",
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void
) => {
  setChatHistory(prev => 
    prev.map(msg => 
      msg.timestamp === timestamp 
        ? { ...msg, feedback: type }
        : msg
    )
  );
  console.log(`Feedback ${type} for message at ${timestamp}`);
};

export const regenerateResponse = (
  allowRegenerate: boolean,
  chatHistory: ChatMessage[],
  isTyping: boolean,
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>
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
  setTimeout(() => {
    const newAiMessage: ChatMessage = {
      content: "This is a regenerated response with different content.",
      isAgent: true,
      timestamp: new Date().toISOString(),
    };

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
