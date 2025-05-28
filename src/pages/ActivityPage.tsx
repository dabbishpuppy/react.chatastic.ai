
import React, { useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import ConversationViewSkeleton from "@/components/activity/ConversationViewSkeleton";
import { useOptimizedActivityData } from "./activity/OptimizedActivityHooksV2";
import { useActivityRealtime } from "./activity/ActivityPageRealtime";
import { getConversationTheme, EmptyState } from "./activity/ActivityPageUtils";

const ActivityPage: React.FC = () => {
  const {
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
  } = useOptimizedActivityData();

  // Set up real-time subscriptions
  useActivityRealtime({
    agentId,
    conversations,
    loadConversations
  });

  useEffect(() => {
    if (agentId) {
      console.log('🎬 ActivityPage: Starting to load conversations for agent:', agentId);
      loadConversations();
    }
  }, [agentId, loadConversations]);

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
        {!hasAnyConversations && !isLoadingConversations ? (
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
                selectedConversationId={selectedConversationId}
                isLoading={isLoadingConversations}
              />
            </div>
            <div className="w-1/2 min-w-[400px]">
              {isLoadingConversation ? (
                <ConversationViewSkeleton />
              ) : selectedConversation && selectedDBConversation ? (
                <div className="h-[calc(100vh-240px)] bg-white rounded-lg border overflow-hidden" style={{ scrollbarWidth: 'thin' }}>
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
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-white rounded-lg border">
                  <p className="text-gray-500">
                    {isLoadingConversations ? "Loading conversations..." : "Select a conversation to view details"}
                  </p>
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
