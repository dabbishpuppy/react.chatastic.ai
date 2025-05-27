
import { ChatInterfaceSettings, SuggestedMessage, defaultChatSettings } from '@/types/chatInterface';

// Helper function to ensure suggested_messages is always an array
export const ensureSuggestedMessagesArray = (messages: any): SuggestedMessage[] => {
  if (!messages) return [];
  
  if (Array.isArray(messages)) {
    return messages.map((msg, index) => ({
      id: msg.id || `msg-${index}`,
      text: msg.text || (typeof msg === 'string' ? msg : '')
    }));
  }
  
  if (typeof messages === 'string') {
    try {
      const parsed = JSON.parse(messages);
      if (Array.isArray(parsed)) {
        return parsed.map((msg, index) => ({
          id: msg.id || `msg-${index}`,
          text: msg.text || (typeof msg === 'string' ? msg : '')
        }));
      }
    } catch (error) {
      console.error('Error parsing suggested_messages string:', error);
    }
  }
  
  return [];
};

// Helper function to ensure theme is properly typed
export const ensureValidTheme = (theme: any): 'light' | 'dark' | 'system' => {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'light'; // default fallback
};

// Helper function to ensure bubble_position is properly typed
export const ensureValidBubblePosition = (position: any): 'left' | 'right' => {
  if (position === 'left' || position === 'right') {
    return position;
  }
  return 'right'; // default fallback
};

// Helper function to create properly typed ChatInterfaceSettings
export const createTypedSettings = (data: any, agentId?: string): ChatInterfaceSettings => {
  return {
    ...defaultChatSettings,
    ...data,
    agent_id: agentId || data.agent_id,
    theme: ensureValidTheme(data.theme),
    bubble_position: ensureValidBubblePosition(data.bubble_position),
    suggested_messages: ensureSuggestedMessagesArray(data.suggested_messages),
    sync_colors: data.sync_colors !== undefined ? data.sync_colors : false,
    primary_color: data.primary_color || defaultChatSettings.primary_color || '#3B82F6',
    profile_picture: data.profile_picture || null,
    chat_icon: data.chat_icon || null
  };
};

// Helper function to check if settings have changed
export const checkForChanges = (draft: ChatInterfaceSettings, saved: ChatInterfaceSettings): boolean => {
  return JSON.stringify(draft) !== JSON.stringify(saved);
};
