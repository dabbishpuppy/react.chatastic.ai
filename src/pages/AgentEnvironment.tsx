
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

      {/* Sidebar + Main content */}
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen bg-background overflow-hidden">
          {/* Left Navigation Sidebar */}
          <Sidebar>
            <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Chat Container */}
            <div className="flex-1 flex flex-col bg-gray-50 p-4 overflow-auto" style={{ backgroundSize: "20px 20px", backgroundImage: "radial-gradient(circle, #d0d0d0 1px, rgba(0, 0, 0, 0) 1px)" }}>
              <ChatSection initialMessages={initialMessages} />
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AgentEnvironment;
