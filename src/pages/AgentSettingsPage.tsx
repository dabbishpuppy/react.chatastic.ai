
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
import AvatarSettings from "@/components/agent/settings/AvatarSettings";

const AgentSettingsPage: React.FC = () => {
  const { agentId } = useParams();
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Extract the active tab from the URL
  const getActiveTab = () => {
    const parts = currentPath.split('/');
    // Get the last non-empty segment of the URL
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] && parts[i] !== "settings") {
        return parts[i];
      }
    }
    return "general";
  };

  return (
    <AgentPageLayout defaultActiveTab="" defaultPageTitle="Settings">
      <div className="flex p-6 bg-[#f5f5f5] -m-6">
        {/* Settings sidebar */}
        <div className="w-64 bg-white rounded-lg mr-6 overflow-hidden">
          <AgentSettingsSidebar activeTab={getActiveTab()} />
        </div>
        
        {/* Settings content */}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="chat-interface" element={<ChatInterfaceSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="leads" element={<LeadsSettings />} />
            <Route path="notifications" element={<NotificationsSettings />} />
            <Route path="custom-domains" element={<CustomDomainsSettings />} />
            <Route path="avatar" element={<AvatarSettings />} />
          </Routes>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default AgentSettingsPage;
