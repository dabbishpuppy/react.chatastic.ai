
import { useState, useEffect } from "react";

// Mock conversation data
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  snippet: string;
  daysAgo: string;
  source: string;
  messages: Message[];
}

// Sample conversation data
const conversations: Conversation[] = [
  {
    id: "1",
    title: "Hei! Våre åpningstider er som følger...",
    snippet: "Hei! Hva er åpningstidene deres?",
    daysAgo: "5 days ago",
    source: "Widget or Iframe",
    messages: [
      { id: "1-1", role: "user", content: "Hei! Hva er åpningstidene deres?", timestamp: "2023-05-17T14:22:00Z" },
      { id: "1-2", role: "assistant", content: "Hei! Våre åpningstider er som følger: Mandag-fredag: 10:00-20:00, Lørdag: 10:00-18:00, Søndag: Stengt.", timestamp: "2023-05-17T14:22:30Z" },
    ]
  },
  {
    id: "2",
    title: "Hei! Takk for at du tok kontakt med...",
    snippet: "Hei, vi var å spiste middag hos dere i går (var en...",
    daysAgo: "19 days ago",
    source: "Widget or Iframe",
    messages: [
      { id: "2-1", role: "user", content: "Hei, vi var å spiste middag hos dere i går (var en gruppe på 6 personer) og jeg glemte jakken min igjen. Den er sort og fra North Face. Har dere funnet den?", timestamp: "2023-05-03T18:45:00Z" },
      { id: "2-2", role: "assistant", content: "Hei! Takk for at du tok kontakt med oss. Vi har faktisk funnet en sort North Face-jakke som ble lagt i vår hittegodsavdeling i går kveld. Du kan komme når som helst i åpningstiden vår for å hente den. Vi holder den til side for deg. Trenger du informasjon om åpningstidene våre?", timestamp: "2023-05-03T18:46:30Z" },
    ]
  },
  // ... more conversations
];

// Store our conversations in memory
let conversationsData = [...conversations];

// Function to get a conversation by ID
export const getConversationById = (id: string): Conversation | null => {
  return conversationsData.find(conv => conv.id === id) || null;
};

// Function to delete all conversations
export const deleteAllConversations = (): void => {
  conversationsData = [];
};

// Function to get all conversations
export const getAllConversations = (): Conversation[] => {
  return [...conversationsData];
};

// Function to add a new conversation
export const addConversation = (conversation: Conversation): void => {
  conversationsData.push(conversation);
};
