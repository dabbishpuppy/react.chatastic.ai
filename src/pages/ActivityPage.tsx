
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import ConversationView from "@/components/agent/ConversationView";
import { Conversation, getConversationById } from "@/components/activity/ConversationData";

const ActivityPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleConversationClick = (conversationId: string) => {
    const conversation = getConversationById(conversationId);
    setSelectedConversation(conversation);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
  };

  const renderTitleActions = () => (
    <div className="flex gap-2">
      <ChatLogsTab.ActionButtons />
    </div>
  );

  return (
    <AgentPageLayout 
      defaultActiveTab="activity" 
      defaultPageTitle="Activity"
      titleActions={renderTitleActions()}
      showPageTitle={true}
    >
      <div className="flex flex-col p-8 pt-6 bg-[#f5f5f5] overflow-hidden min-h-screen">
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
