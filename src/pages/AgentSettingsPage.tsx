
import React from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import AgentSettingsSidebar from "@/components/agent/AgentSettingsSidebar";
import { useParams, Outlet } from "react-router-dom";

const AgentSettingsPage: React.FC = () => {
  const { settingsTab = "general" } = useParams();

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r overflow-y-auto bg-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <AgentSettingsSidebar activeTab={settingsTab} />
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSettingsPage;
