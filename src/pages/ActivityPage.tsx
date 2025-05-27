import React, { useState, useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import { conversationService, Conversation as DBConversation } from "@/services/conversationService";
import { getChatSettings } from "@/services/chatSettingsService";
import { Conversation as UIConversation } from "@/components/activity/ConversationData";
import { ChatInterfaceSettings, SuggestedMessage } from "@/types/chatInterface";
import { useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

const ActivityPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [selectedConversation, setSelectedConversation] = useState<UIConversation | null>(null);
  const [hasAnyConversations, setHasAnyConversations] = useState<boolean>(true);
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [chatSettings, setChatSettings] = useState<ChatInterfaceSettings | null>(null);

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
      
      // Auto-select first conversation if available
      if (recentConversations.length > 0 && !selectedConversation) {
        const firstConversation = await convertDBConversationToUI(recentConversations[0]);
        setSelectedConversation(firstConversation);
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
          ...settings,
          theme: (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') 
            ? settings.theme 
            : 'light',
          bubble_position: (settings.bubble_position === 'left' || settings.bubble_position === 'right')
            ? settings.bubble_position
            : 'right',
          suggested_messages: Array.isArray(settings.suggested_messages) 
            ? settings.suggested_messages as SuggestedMessage[]
            : (typeof settings.suggested_messages === 'string' 
               ? JSON.parse(settings.suggested_messages) 
               : [])
        };
        setChatSettings(typedSettings);
      }
    } catch (error) {
      console.error('Error loading chat settings:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const success = await conversationService.deleteConversation(conversationId);
      
      if (success) {
        const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
        setConversations(updatedConversations);
        setHasAnyConversations(updatedConversations.length > 0);
        
        // Close conversation view if the deleted conversation was selected
        if (selectedConversation?.id === conversationId) {
          // Auto-select next conversation if available
          if (updatedConversations.length > 0) {
            const nextConversation = await convertDBConversationToUI(updatedConversations[0]);
            setSelectedConversation(nextConversation);
          } else {
            setSelectedConversation(null);
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

  const convertDBConversationToUI = async (dbConversation: DBConversation): Promise<UIConversation> => {
    // Get messages for this conversation
    const messages = await conversationService.getMessages(dbConversation.id);
    
    // Convert messages to UI format
    const uiMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.is_agent ? 'assistant' : 'user' as 'assistant' | 'user',
      content: msg.content,
      timestamp: msg.timestamp
    }));

    const daysAgo = formatDistanceToNow(new Date(dbConversation.created_at), { addSuffix: true });
    const title = dbConversation.title || `Chat from ${daysAgo}`;
    
    // Get snippet from last message
    let snippet = 'No messages';
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const content = lastMessage.content;
      snippet = content.length > 50 ? content.substring(0, 50) + '...' : content;
    }

    return {
      id: dbConversation.id,
      title,
      snippet,
      daysAgo,
      source: dbConversation.source === 'bubble' ? 'Widget' : 'Iframe',
      messages: uiMessages
    };
  };

  const handleConversationClick = async (conversationId: string) => {
    const dbConversation = conversations.find(c => c.id === conversationId);
    if (dbConversation) {
      const uiConversation = await convertDBConversationToUI(dbConversation);
      setSelectedConversation(uiConversation);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
  };

  // Helper function to convert 'system' theme to 'light' or 'dark'
  const getConversationTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
    if (theme === 'system') {
      // Check if user prefers dark mode
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
              {selectedConversation ? (
                <ConversationView 
                  conversation={selectedConversation} 
                  onClose={() => {}}
                  onDelete={() => handleDeleteConversation(selectedConversation.id)}
                  theme={getConversationTheme(chatSettings?.theme || 'light')}
                  profilePicture={chatSettings?.profile_picture}
                  displayName={chatSettings?.display_name}
                  userMessageColor={chatSettings?.user_message_color}
                  showDeleteButton={true}
                  initialMessage={chatSettings?.initial_message}
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
