
import { ChatMessage } from "@/types/chatInterface";

export interface ChatSectionState {
  agentId: string | undefined;
  displayMessages: ChatMessage[];
  setDisplayMessages: (messages: ChatMessage[]) => void;
  hasShownLeadForm: boolean;
  setHasShownLeadForm: (value: boolean) => void;
  effectiveLeadSettings: any;
  refreshSettings: () => void;
  currentConversation: any;
  conversationEnded: boolean;
  startNewConversation: () => Promise<void>;
  endCurrentConversation: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  getConversationMessages: (conversationId: string) => Promise<ChatMessage[]>;
  message: string;
  setMessage: (message: string) => void;
  chatHistory: ChatMessage[];
  setChatHistory: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  isTyping: boolean;
  rateLimitError: string | null;
  timeUntilReset: number | null;
  userHasMessaged: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  copyMessageToClipboard: (content: string) => void;
  handleFeedback: (timestamp: string, type: "like" | "dislike") => void;
  insertEmoji: (emoji: string) => void;
  handleCountdownFinished: () => void;
  cleanup: () => void;
  isSubmitting: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
  handleSubmitWithAgentId: (e: React.FormEvent) => Promise<void>;
  handleSuggestedMessageClickWithAgentId: (text: string) => Promise<void>;
  handleRegenerateWithAgentId: (allowRegenerate: boolean) => Promise<void>;
}
