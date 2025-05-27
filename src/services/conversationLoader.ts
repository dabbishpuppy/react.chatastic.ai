
import { conversationService } from "@/services/conversationService";
import { getChatSettings } from "@/services/chatSettingsService";

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'like' | 'dislike';
}

export const conversationLoader = {
  async loadConversationWithGreeting(conversationId: string, agentId: string): Promise<ConversationMessage[]> {
    console.log('🔄 Loading conversation with greeting:', { conversationId, agentId });
    
    // Load stored messages from database
    const storedMessages = await conversationService.getMessages(conversationId);
    console.log('📥 Stored messages:', storedMessages);
    
    // Get chat settings for initial greeting
    const chatSettings = await getChatSettings(agentId);
    const initialGreeting = chatSettings?.initial_message || "👋 Hi! How can I help you today?";
    
    // Create the merged message list
    const messages: ConversationMessage[] = [];
    
    // Add initial greeting as first message
    const greetingTimestamp = storedMessages.length > 0 
      ? new Date(new Date(storedMessages[0].timestamp).getTime() - 1000).toISOString()
      : new Date().toISOString();
      
    messages.push({
      id: 'initial-message',
      role: 'assistant',
      content: initialGreeting,
      timestamp: greetingTimestamp,
      feedback: undefined
    });
    
    // Add all stored messages
    storedMessages.forEach(msg => {
      messages.push({
        id: msg.id,
        role: msg.is_agent ? 'assistant' : 'user',
        content: msg.content,
        timestamp: msg.timestamp,
        feedback: msg.feedback as 'like' | 'dislike' | undefined
      });
    });
    
    // Sort by timestamp to ensure proper order
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log('✅ Final merged messages:', messages);
    return messages;
  }
};
