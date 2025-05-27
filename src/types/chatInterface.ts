
export interface ChatMessage {
  id?: string; // Optional ID from database
  content: string;
  isAgent: boolean;
  timestamp: string;
  feedback?: "like" | "dislike";
}
