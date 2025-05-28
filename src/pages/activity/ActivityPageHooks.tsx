
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { conversationService, Conversation as DBConversation } from "@/services/conversationService";
import { getChatSettings } from "@/services/chatSettingsService";
import { conversationLoader, ConversationMessage } from "@/services/conversationLoader";
import { ChatInterfaceSettings, SuggestedMessage } from "@/types/chatInterface";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// UI Conversation interface for the activity page
export interface UIConversation {
  id: string;
  title: string;
  snippet: string;
  daysAgo: string;
  source: string;
  messages: ConversationMessage[];
}

export const useActivityPageData = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [selectedConversation, setSelectedConversation] = useState<UIConversation | null>(null);
  const [selectedDBConversation, setSelectedDBConversation] = useState<DBConversation | null>(null);
  const [hasAnyConversations, setHasAnyConversations] = useState<boolean>(true);
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [chatSettings, setChatSettings] = useState<ChatInterfaceSettings | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Helper function to ensure suggested_messages is properly typed
  const ensureSuggestedMessagesArray = (messages: any): SuggestedMessage[] => {
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

  // Default chat settings to use when none are found
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

  const loadConversations = async () => {
    if (!agentId) return;
    
    try {
      const recentConversations = await conversationService.getRecentConversations(agentId, 50);
      setConversations(recentConversations);
      setHasAnyConversations(recentConversations.length > 0);
      
      // Auto-select first conversation if available and no conversation is currently selected
      if (recentConversations.length > 0 && !selectedConversation) {
        await handleConversationClick(recentConversations[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setHasAnyConversations(false);
    }
  };

  const loadChatSettings = async () => {
    if (!agentId) return;
    
    try {
      const settings = await getChatSettings(agentId);
      if (settings) {
        // Ensure proper typing for the settings
        const typedSettings: ChatInterfaceSettings = {
          ...defaultChatSettings,
          ...settings,
          theme: (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') 
            ? settings.theme 
            : 'light',
          bubble_position: (settings.bubble_position === 'left' || settings.bubble_position === 'right')
            ? settings.bubble_position
            : 'right',
          suggested_messages: ensureSuggestedMessagesArray(settings.suggested_messages),
          user_message_color: settings.user_message_color || '#000000',
        };
        setChatSettings(typedSettings);
      } else {
        setChatSettings(defaultChatSettings);
      }
    } catch (error) {
      console.error('Error loading chat settings:', error);
      setChatSettings(defaultChatSettings);
    }
  };

  const convertDBConversationToUI = async (dbConversation: DBConversation): Promise<UIConversation | null> => {
    if (!agentId) {
      console.error('Agent ID is required for conversation conversion');
      return null;
    }

    try {
      // Use the conversation loader to get messages with greeting
      const messages = await conversationLoader.loadConversationWithGreeting(
        dbConversation.id, 
        agentId
      );

      const daysAgo = formatDistanceToNow(new Date(dbConversation.created_at), { addSuffix: true });
      const title = dbConversation.title || `Chat from ${daysAgo}`;
      
      let snippet = 'No messages';
      if (messages.length > 1) { // Skip initial greeting for snippet
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage.content;
        snippet = content.length > 50 ? content.substring(0, 50) + '...' : content;
      } else if (messages.length === 1) {
        // Only initial greeting exists
        const content = messages[0].content;
        snippet = content.length > 50 ? content.substring(0, 50) + '...' : content;
      }

      const source = dbConversation.source === 'bubble' ? 'Widget' : 'Iframe';

      return {
        id: dbConversation.id,
        title,
        snippet,
        daysAgo,
        source,
        messages
      };
    } catch (error) {
      console.error('Error converting conversation:', error);
      return null;
    }
  };

  const handleConversationClick = async (conversationId: string) => {
    console.log('Conversation clicked:', conversationId);
    setIsLoadingConversation(true);
    
    try {
      // First check if the conversation exists in our current list
      const dbConversation = conversations.find(c => c.id === conversationId);
      if (!dbConversation) {
        console.warn('Conversation not found in current conversations list:', conversationId);
        
        // Try to fetch the conversation directly from the database
        try {
          const fetchedConversation = await conversationService.getConversationById(conversationId);
          if (!fetchedConversation) {
            console.error('Conversation not found in database:', conversationId);
            toast({
              title: "Conversation not found",
              description: "This conversation may have been deleted or you don't have access to it.",
              variant: "destructive",
            });
            return;
          }
          
          // If found, check if it belongs to the current agent
          if (fetchedConversation.agent_id !== agentId) {
            console.warn('Conversation belongs to different agent:', {
              conversationId,
              conversationAgentId: fetchedConversation.agent_id,
              currentAgentId: agentId
            });
            toast({
              title: "Access denied",
              description: "This conversation doesn't belong to the current agent.",
              variant: "destructive",
            });
            return;
          }
          
          // Use the fetched conversation
          const uiConversation = await convertDBConversationToUI(fetchedConversation);
          if (uiConversation) {
            setSelectedConversation(uiConversation);
            setSelectedDBConversation(fetchedConversation);
          }
          return;
        } catch (fetchError) {
          console.error('Error fetching conversation from database:', fetchError);
          toast({
            title: "Error",
            description: "Failed to load conversation data.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Found DB conversation:', dbConversation);
      const uiConversation = await convertDBConversationToUI(dbConversation);
      if (uiConversation) {
        console.log('Converted UI conversation:', uiConversation);
        setSelectedConversation(uiConversation);
        setSelectedDBConversation(dbConversation);
      } else {
        console.error('Failed to convert conversation to UI format');
        toast({
          title: "Error",
          description: "Failed to load conversation data.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load the conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const success = await conversationService.deleteConversation(conversationId);
      
      if (success) {
        const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
        setConversations(updatedConversations);
        setHasAnyConversations(updatedConversations.length > 0);
        
        if (selectedConversation?.id === conversationId) {
          if (updatedConversations.length > 0) {
            await handleConversationClick(updatedConversations[0].id);
          } else {
            setSelectedConversation(null);
            setSelectedDBConversation(null);
          }
        }
        
        toast({
          title: "Conversation deleted",
          description: "The conversation has been successfully deleted.",
        });
      } else {
        throw new Error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete the conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    agentId,
    selectedConversation,
    selectedDBConversation,
    hasAnyConversations,
    conversations,
    chatSettings,
    isLoadingConversation,
    loadConversations,
    loadChatSettings,
    handleConversationClick,
    deleteConversation,
    setConversations,
    setHasAnyConversations,
    setSelectedConversation,
    setSelectedDBConversation
  };
};
