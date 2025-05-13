
import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { useParams } from "react-router-dom";
import AgentSidebar from "@/components/agent/AgentSidebar";
import AnalyticsTab from "@/components/analytics/AnalyticsTab";

const AnalyticsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [activeTab, setActiveTab] = useState("analytics");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
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
            <AnalyticsTab />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
