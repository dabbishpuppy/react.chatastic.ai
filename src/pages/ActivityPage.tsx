
import React, { useState, useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import { conversationService, Conversation as DBConversation } from "@/services/conversationService";
import { Conversation as UIConversation } from "@/components/activity/ConversationData";
import { useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const ActivityPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [selectedConversation, setSelectedConversation] = useState<UIConversation | null>(null);
  const [hasAnyConversations, setHasAnyConversations] = useState<boolean>(true);
  const [conversations, setConversations] = useState<DBConversation[]>([]);

  useEffect(() => {
    if (agentId) {
      loadConversations();
    }
  }, [agentId]);

  const loadConversations = async () => {
    if (!agentId) return;
    
    try {
      const recentConversations = await conversationService.getRecentConversations(agentId, 50);
      setConversations(recentConversations);
      setHasAnyConversations(recentConversations.length > 0);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setHasAnyConversations(false);
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
    const snippet = messages.length > 0 ? 
      `${messages.length} message${messages.length !== 1 ? 's' : ''} • ${dbConversation.status}` : 
      'No messages';

    return {
      id: dbConversation.id,
      title,
      snippet,
      daysAgo,
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

  const handleCloseConversation = () => {
    setSelectedConversation(null);
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
          <div className={`flex flex-1 ${selectedConversation ? "pr-4" : ""} overflow-hidden`}>
            <div className={`flex-1 transition-all ${selectedConversation ? "pr-4" : ""}`}>
              <ChatLogsTab 
                onConversationClick={handleConversationClick} 
                hideTitle
                conversations={conversations}
                onRefresh={loadConversations}
              />
            </div>
            {selectedConversation && (
              <div className="w-1/3 min-w-[320px]">
                <ConversationView 
                  conversation={selectedConversation} 
                  onClose={handleCloseConversation} 
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AgentPageLayout>
  );
};

export default ActivityPage;
