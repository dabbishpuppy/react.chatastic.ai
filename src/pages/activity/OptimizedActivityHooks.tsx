import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { conversationService, Conversation as DBConversation } from "@/services/conversationService";
import { getChatSettings } from "@/services/chatSettingsService";
import { conversationLoader } from "@/services/conversationLoader";
import { ChatInterfaceSettings } from "@/types/chatInterface";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

export interface ConversationWithSnippet extends DBConversation {
  snippet: string;
  title: string;
  daysAgo: string;
}

export const useOptimizedActivityData = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [conversations, setConversations] = useState<ConversationWithSnippet[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [selectedDBConversation, setSelectedDBConversation] = useState<DBConversation | null>(null);
  const [chatSettings, setChatSettings] = useState<ChatInterfaceSettings | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [hasAnyConversations, setHasAnyConversations] = useState(true);

  // Default chat settings
  const defaultChatSettings: ChatInterfaceSettings = {
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
  };

  // Helper function to validate and map settings from database
  const mapDatabaseSettings = (dbSettings: any): ChatInterfaceSettings => {
    if (!dbSettings) return defaultChatSettings;

    // Ensure theme is a valid value
    const validTheme = ['light', 'dark', 'system'].includes(dbSettings.theme) 
      ? dbSettings.theme as 'light' | 'dark' | 'system'
      : 'light';

    // Parse suggested_messages if it's a string
    let suggestedMessages = [];
    if (dbSettings.suggested_messages) {
      try {
        suggestedMessages = typeof dbSettings.suggested_messages === 'string' 
          ? JSON.parse(dbSettings.suggested_messages) 
          : dbSettings.suggested_messages;
      } catch (error) {
        console.warn('Failed to parse suggested_messages:', error);
        suggestedMessages = [];
      }
    }

    return {
      initial_message: dbSettings.initial_message || defaultChatSettings.initial_message,
      suggested_messages: Array.isArray(suggestedMessages) ? suggestedMessages : [],
      message_placeholder: dbSettings.message_placeholder || defaultChatSettings.message_placeholder,
      show_feedback: dbSettings.show_feedback ?? defaultChatSettings.show_feedback,
      allow_regenerate: dbSettings.allow_regenerate ?? defaultChatSettings.allow_regenerate,
      theme: validTheme,
      display_name: dbSettings.display_name || defaultChatSettings.display_name,
      bubble_position: dbSettings.bubble_position || defaultChatSettings.bubble_position,
      show_suggestions_after_chat: dbSettings.show_suggestions_after_chat ?? defaultChatSettings.show_suggestions_after_chat,
      auto_show_delay: dbSettings.auto_show_delay ?? defaultChatSettings.auto_show_delay,
      user_message_color: dbSettings.user_message_color || defaultChatSettings.user_message_color,
      bubble_color: dbSettings.bubble_color || defaultChatSettings.bubble_color,
      sync_colors: dbSettings.sync_colors ?? defaultChatSettings.sync_colors,
      primary_color: dbSettings.primary_color || defaultChatSettings.primary_color,
      profile_picture: dbSettings.profile_picture || undefined,
      chat_icon: dbSettings.chat_icon || undefined,
      footer: dbSettings.footer || undefined
    };
  };

  // Generate snippet from conversation without loading all messages
  const generateSnippet = useCallback((conversation: DBConversation): string => {
    if (conversation.title) {
      return conversation.title.length > 60 ? conversation.title.substring(0, 60) + '...' : conversation.title;
    }
    return 'New conversation';
  }, []);

  // Load conversations with optimized snippet generation
  const loadConversations = useCallback(async () => {
    if (!agentId) return;

    setIsLoadingConversations(true);
    try {
      const [conversationsData, settingsData] = await Promise.all([
        conversationService.getRecentConversations(agentId, 50),
        getChatSettings(agentId)
      ]);

      // Process conversations with lightweight snippets
      const conversationsWithSnippets: ConversationWithSnippet[] = conversationsData.map(conv => {
        const daysAgo = formatDistanceToNow(new Date(conv.created_at), { addSuffix: true });
        const title = conv.title || `Chat from ${daysAgo}`;
        const snippet = generateSnippet(conv);

        return {
          ...conv,
          title,
          snippet,
          daysAgo
        };
      });

      setConversations(conversationsWithSnippets);
      setHasAnyConversations(conversationsWithSnippets.length > 0);
      
      // Use helper function to properly map settings
      const mappedSettings = mapDatabaseSettings(settingsData);
      setChatSettings(mappedSettings);

      // Auto-select first conversation if available
      if (conversationsWithSnippets.length > 0 && !selectedConversationId) {
        const firstConversation = conversationsWithSnippets[0];
        setSelectedConversationId(firstConversation.id);
        loadConversationMessages(firstConversation);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setHasAnyConversations(false);
      setChatSettings(defaultChatSettings);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [agentId, selectedConversationId, generateSnippet]);

  // Load conversation messages
  const loadConversationMessages = useCallback(async (dbConversation: DBConversation) => {
    if (!agentId) return;

    setIsLoadingConversation(true);
    try {
      const messages = await conversationLoader.loadConversationWithGreeting(
        dbConversation.id,
        agentId
      );

      const daysAgo = formatDistanceToNow(new Date(dbConversation.created_at), { addSuffix: true });
      const title = dbConversation.title || `Chat from ${daysAgo}`;
      const source = dbConversation.source === 'bubble' ? 'Widget' : 'Iframe';

      let snippet = 'No messages';
      if (messages.length > 1) {
        const lastMessage = messages[messages.length - 1];
        snippet = lastMessage.content.length > 50 ? lastMessage.content.substring(0, 50) + '...' : lastMessage.content;
      } else if (messages.length === 1) {
        snippet = messages[0].content.length > 50 ? messages[0].content.substring(0, 50) + '...' : messages[0].content;
      }

      const uiConversation = {
        id: dbConversation.id,
        title,
        snippet,
        daysAgo,
        source,
        messages
      };

      setSelectedConversation(uiConversation);
      setSelectedDBConversation(dbConversation);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation data.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversation(false);
    }
  }, [agentId]);

  // Handle conversation click
  const handleConversationClick = useCallback(async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    
    const dbConversation = conversations.find(c => c.id === conversationId);
    if (dbConversation) {
      await loadConversationMessages(dbConversation);
    }
  }, [conversations, loadConversationMessages]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const success = await conversationService.deleteConversation(conversationId);
      
      if (success) {
        const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
        setConversations(updatedConversations);
        setHasAnyConversations(updatedConversations.length > 0);
        
        if (selectedConversationId === conversationId) {
          if (updatedConversations.length > 0) {
            await handleConversationClick(updatedConversations[0].id);
          } else {
            setSelectedConversation(null);
            setSelectedDBConversation(null);
            setSelectedConversationId(null);
          }
        }
        
        toast({
          title: "Conversation deleted",
          description: "The conversation has been successfully deleted.",
        });
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete the conversation. Please try again.",
        variant: "destructive",
      });
    }
  }, [conversations, selectedConversationId, handleConversationClick]);

  return {
    agentId,
    conversations,
    selectedConversation,
    selectedDBConversation,
    selectedConversationId,
    chatSettings,
    hasAnyConversations,
    isLoadingConversations,
    isLoadingConversation,
    loadConversations,
    handleConversationClick,
    deleteConversation
  };
};
