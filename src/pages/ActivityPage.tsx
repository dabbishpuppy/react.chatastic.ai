
import React, { useState, useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import { conversationService, Conversation as DBConversation } from "@/services/conversationService";
import { getChatSettings } from "@/services/chatSettingsService";
import { conversationLoader, ConversationMessage } from "@/services/conversationLoader";
import { ChatInterfaceSettings, SuggestedMessage } from "@/types/chatInterface";
import { useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// UI Conversation interface for the activity page
interface UIConversation {
  id: string;
  title: string;
  snippet: string;
  daysAgo: string;
  source: string;
  messages: ConversationMessage[];
}

const ActivityPage: React.FC = () => {
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

  // Real-time subscription for messages
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('Real-time message update:', payload);
          
          // Check if this message belongs to a conversation for our current agent
          if (payload.new && typeof payload.new === 'object' && 'conversation_id' in payload.new) {
            const messageConversationId = payload.new.conversation_id;
            
            // Only refresh if this conversation belongs to our current conversations
            const belongsToCurrentAgent = conversations.some(conv => conv.id === messageConversationId);
            if (belongsToCurrentAgent) {
              await loadConversations();
            }
          } else {
            // For other changes, just refresh the conversations list
            await loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, conversations]);

  useEffect(() => {
    if (agentId) {
      loadConversations();
      loadChatSettings();
    }
  }, [agentId]);

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

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
  };

  const getConversationTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center h-64">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 9H16M8 13H14M9 17H15M20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V6.5C4 5.67157 4.67157 5 5.5 5H18.5C19.3284 5 20 5.67157 20 6.5Z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
      <p className="text-gray-500 max-w-md">
        Start chatting with your agent to see conversations appear here.
      </p>
    </div>
  );

  return (
    <AgentPageLayout 
      defaultActiveTab="activity" 
      defaultPageTitle="Chat Log"
      showPageTitle={false}
    >
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Chat Log</h1>
          <div className="flex gap-2">
            <ChatLogsTab.ActionButtons />
          </div>
        </div>
        {!hasAnyConversations ? (
          <EmptyState />
        ) : (
          <div className="flex flex-1 pr-4 overflow-hidden gap-4">
            <div className="w-1/2">
              <ChatLogsTab 
                onConversationClick={handleConversationClick} 
                onConversationDelete={handleDeleteConversation}
                hideTitle
                conversations={conversations}
                onRefresh={loadConversations}
                selectedConversationId={selectedConversation?.id}
              />
            </div>
            <div className="w-1/2 min-w-[400px]">
              {isLoadingConversation ? (
                <div className="flex items-center justify-center h-full bg-white rounded-lg border">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : selectedConversation && selectedDBConversation ? (
                <ConversationView 
                  conversation={selectedConversation} 
                  onClose={() => {}}
                  onDelete={() => handleDeleteConversation(selectedConversation.id)}
                  theme={getConversationTheme(chatSettings?.theme || 'light')}
                  profilePicture={chatSettings?.profile_picture || undefined}
                  displayName={chatSettings?.display_name || 'AI Assistant'}
                  userMessageColor={chatSettings?.user_message_color || '#000000'}
                  showDeleteButton={true}
                  conversationStatus={selectedDBConversation.status}
                  conversationSource={selectedDBConversation.source}
                  agentId={agentId}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-white rounded-lg border">
                  <p className="text-gray-500">Select a conversation to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AgentPageLayout>
  );
};

export default ActivityPage;
