
import React from "react";
import { ChatMessage } from "@/types/chatInterface";

export interface ChatSectionState {
  agentId?: string;
  displayMessages: ChatMessage[];
  setDisplayMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  hasShownLeadForm: boolean;
  setHasShownLeadForm: React.Dispatch<React.SetStateAction<boolean>>;
  effectiveLeadSettings: any;
  refreshSettings: () => Promise<void>;
  currentConversation: any;
  conversationEnded: boolean;
  startNewConversation: () => Promise<void>;
  endCurrentConversation: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  getConversationMessages: (conversationId: string) => Promise<any[]>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isTyping: boolean;
  isThinking: boolean;
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
  typingMessageId: string | null;
  setTypingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  rateLimitError: string | null;
  timeUntilReset: number | null;
  userHasMessaged: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  copyMessageToClipboard: () => void;
  handleFeedback: (messageId: string, isPositive: boolean) => void;
  insertEmoji: (emoji: string) => void;
  handleCountdownFinished: () => void;
  cleanup: () => void;
  isSubmitting: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
  handleSubmitWithAgentId: (e: React.FormEvent, agentId?: string) => Promise<void>;
  handleSuggestedMessageClickWithAgentId: (text: string, agentId?: string) => Promise<void>;
  handleRegenerateWithAgentId: (messageIndex: number, agentId?: string) => Promise<void>;
}
