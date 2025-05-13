
import React from "react";
import { Routes, Route, useParams, useLocation, Navigate } from "react-router-dom";
import AgentPageLayout from "./AgentPageLayout";
import AgentSettingsSidebar from "@/components/agent/AgentSettingsSidebar";
import GeneralSettings from "@/components/agent/settings/GeneralSettings";
import AISettings from "@/components/agent/settings/AISettings";
import ChatInterfaceSettings from "@/components/agent/settings/ChatInterfaceSettings";
import SecuritySettings from "@/components/agent/settings/SecuritySettings";
import LeadsSettings from "@/components/agent/settings/LeadsSettings";
import NotificationsSettings from "@/components/agent/settings/NotificationsSettings";
import CustomDomainsSettings from "@/components/agent/settings/CustomDomainsSettings";

const AgentSettingsPage: React.FC = () => {
  const { agentId } = useParams();
  const location = useLocation();
  const currentPath = location.pathname;
  const settingsPath = `/agent/${agentId}/settings`;
  
  // Extract the active tab from the URL
  const getActiveTab = () => {
    const pathParts = currentPath.split('/');
    return pathParts[pathParts.length - 1];
  };

  return (
    <AgentPageLayout defaultActiveTab="" defaultPageTitle="Settings">
      <div className="flex">
        {/* Settings sidebar */}
        <div className="w-64 border-r">
          <AgentSettingsSidebar activeTab={getActiveTab()} />
        </div>
        
        {/* Settings content */}
        <div className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="general" replace />} />
            <Route path="/general" element={<GeneralSettings />} />
            <Route path="/ai" element={<AISettings />} />
            <Route path="/chat-interface" element={<ChatInterfaceSettings />} />
            <Route path="/security" element={<SecuritySettings />} />
            <Route path="/leads" element={<LeadsSettings />} />
            <Route path="/notifications" element={<NotificationsSettings />} />
            <Route path="/custom-domains" element={<CustomDomainsSettings />} />
          </Routes>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default AgentSettingsPage;
