
import React, { useState, useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import { Conversation, getConversationById, deleteAllConversations } from "@/components/activity/ConversationData";

const ActivityPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleConversationClick = (conversationId: string) => {
    const conversation = getConversationById(conversationId);
    setSelectedConversation(conversation);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
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
        <div className={`flex flex-1 ${selectedConversation ? "pr-4" : ""} overflow-hidden`}>
          <div className={`flex-1 transition-all ${selectedConversation ? "pr-4" : ""}`}>
            <ChatLogsTab onConversationClick={handleConversationClick} hideTitle />
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
      </div>
    </AgentPageLayout>
  );
};

export default ActivityPage;
