
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

export const isDuplicateMessage = (content: string, conversationId?: string): boolean => {
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

export const isDuplicateAIResponse = (content: string, conversationId: string): boolean => {
  const aiKey = `${conversationId}-ai-${content}`;
  const now = Date.now();
  const lastAiResponse = recentMessages.get(aiKey);
  
  if (lastAiResponse && now - lastAiResponse < 2000) { // Expanded to 2 second window for AI responses
    console.log('🚫 Duplicate AI response detected, skipping');
    return true;
  }
  
  recentMessages.set(aiKey, now);
  return false;
};
