
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Settings } from "lucide-react";
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar";
import TopNavBar from "@/components/layout/TopNavBar";
import AgentSidebar from "@/components/agent/AgentSidebar";
import ChatSection from "@/components/agent/ChatSection";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";

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

        {/* Main content area with dot pattern background */}
        <div 
          className="flex-1 p-6 overflow-auto bg-gray-50 flex justify-center"
          style={{ backgroundSize: "20px 20px", backgroundImage: "radial-gradient(circle, #d0d0d0 1px, rgba(0, 0, 0, 0) 1px)" }}
        >
          <div className="w-full max-w-[30rem] relative">
            {/* LLM Settings Toggle Button */}
            <div className="absolute -left-14 top-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full h-10 w-10 bg-white shadow-sm hover:bg-gray-100"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-96 p-0 bg-white">
                  <LLMSettingsPanel />
                </SheetContent>
              </Sheet>
            </div>
            
            <ChatSection initialMessages={initialMessages} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentEnvironment;
