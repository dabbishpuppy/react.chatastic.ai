
export interface SuggestedMessage {
  id: string;
  text: string;
}

export interface ChatInterfaceSettings {
  id?: string;
  agent_id?: string;
  initial_message: string;
  suggested_messages: SuggestedMessage[];
  message_placeholder: string;
  show_feedback: boolean;
  allow_regenerate: boolean;
  theme: 'light' | 'dark' | 'system';
  display_name: string;
  profile_picture?: string | null;
  chat_icon?: string | null;
  bubble_position: 'left' | 'right';
  show_suggestions_after_chat: boolean;
  auto_show_delay: number;
  footer?: string | null;
}

export interface ChatMessage {
  isAgent: boolean;
  content: string;
  timestamp: string;
  feedback?: "like" | "dislike" | null;
}

export const defaultChatSettings: ChatInterfaceSettings = {
  initial_message: '👋 Hi! How can I help you today?',
  suggested_messages: [],
  message_placeholder: 'Write message here...',
  show_feedback: true,
  allow_regenerate: true,
  theme: 'light',
  display_name: 'AI Assistant',
  bubble_position: 'right',
  show_suggestions_after_chat: true,
  auto_show_delay: 1,
}
