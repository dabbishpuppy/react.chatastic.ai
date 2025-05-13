
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar";
import TopNavBar from "@/components/layout/TopNavBar";
import AgentSidebar from "@/components/agent/AgentSidebar";
import ChatSection from "@/components/agent/ChatSection";

const AgentEnvironment = () => {
  const { agentId } = useParams();
  const [activeTab, setActiveTab] = useState("playground");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Initial chat message
  const initialMessages = [
    {
      isAgent: true,
      content: "👋 Hi! I'm Wonder AI. How can I help you today?",
      timestamp: new Date().toISOString()
    }
  ];

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

        {/* Main content area */}
        <div className="flex-1 p-6 overflow-auto bg-gray-50 flex justify-center">
          <div className="w-full max-w-3xl">
            <ChatSection initialMessages={initialMessages} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentEnvironment;
