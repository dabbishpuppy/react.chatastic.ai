
export interface ChatMessage {
  id?: string; // Optional ID from database
  content: string;
  isAgent: boolean;
  timestamp: string;
  feedback?: "like" | "dislike";
}

export interface SuggestedMessage {
  id: string;
  text: string;
}

export interface ChatInterfaceSettings {
  agent_id?: string;
  display_name: string;
  initial_message: string;
  message_placeholder: string;
  theme: 'light' | 'dark' | 'system';
  profile_picture?: string | null;
  chat_icon?: string | null;
  bubble_position: 'left' | 'right';
  footer?: string | null;
  user_message_color?: string | null;
  bubble_color?: string | null;
  sync_colors: boolean;
  primary_color?: string | null;
  show_feedback: boolean;
  allow_regenerate: boolean;
  suggested_messages: SuggestedMessage[];
  show_suggestions_after_chat: boolean;
  auto_show_delay: number;
}

export const defaultChatSettings: ChatInterfaceSettings = {
  display_name: 'AI Assistant',
  initial_message: '👋 Hi! How can I help you today?',
  message_placeholder: 'Write message here...',
  theme: 'light',
  profile_picture: null,
  chat_icon: null,
  bubble_position: 'right',
  footer: null,
  user_message_color: null,
  bubble_color: null,
  sync_colors: false,
  primary_color: '#3B82F6',
  show_feedback: true,
  allow_regenerate: true,
  suggested_messages: [],
  show_suggestions_after_chat: true,
  auto_show_delay: 1
};
