
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'like' | 'dislike'; // Add feedback property
}

export interface Conversation {
  id: string;
  title: string;
  snippet: string;
  daysAgo: string;
  source: string;
  messages: ConversationMessage[];
}
