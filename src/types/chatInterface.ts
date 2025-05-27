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
  user_message_color?: string | null;
  bubble_color?: string | null;
  primary_color?: string | null;
  sync_colors?: boolean;
}

export interface ChatMessage {
  id?: string; // Add id field for database operations
  content: string;
  isAgent: boolean;
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
  user_message_color: '#000000',
  bubble_color: '#000000',
  sync_colors: false,
  primary_color: '#000000'
}
