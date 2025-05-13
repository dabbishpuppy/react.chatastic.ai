
import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentSidebar from "@/components/agent/AgentSidebar";
import ConversationView from "@/components/agent/ConversationView";
import ChatLogsTab from "@/components/activity/ChatLogsTab";
import LeadsTab from "@/components/activity/LeadsTab";
import { getConversationById } from "@/components/activity/ConversationData";

const ActivityPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [activeTab, setActiveTab] = useState("activity");
  const [selectedTab, setSelectedTab] = useState("chat-logs");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r overflow-y-auto bg-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold">Playground</h1>
          </div>
          <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Activity</h1>

            {selectedConversation ? (
              <ConversationView 
                conversation={getConversationById(selectedConversation)} 
                onClose={handleCloseConversation} 
              />
            ) : (
              <Tabs defaultValue="chat-logs" onValueChange={setSelectedTab} className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="chat-logs" className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Chat Logs
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="flex items-center gap-2">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Leads
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat-logs" className="space-y-4">
                  <ChatLogsTab onConversationClick={handleConversationClick} />
                </TabsContent>

                <TabsContent value="leads" className="space-y-4">
                  <LeadsTab />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
