
import React, { useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import { useActivityPageData } from "./activity/ActivityPageHooks";
import { useActivityRealtime } from "./activity/ActivityPageRealtime";
import { getConversationTheme, EmptyState } from "./activity/ActivityPageUtils";

const ActivityPage: React.FC = () => {
  const {
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
    deleteConversation
  } = useActivityPageData();

  // Set up real-time subscriptions
  useActivityRealtime({
    agentId,
    conversations,
    loadConversations
  });

  useEffect(() => {
    if (agentId) {
      loadConversations();
      loadChatSettings();
    }
  }, [agentId]);

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
  };

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
