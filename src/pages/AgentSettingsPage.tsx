
import React from "react";
import { Routes, Route, useParams, useLocation, Navigate } from "react-router-dom";
import AgentPageLayout from "./AgentPageLayout";
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
  
  // Extract the active tab from the URL
  const getActiveTab = () => {
    const parts = location.pathname.split('/');
    // Get the last non-empty segment of the URL
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] && parts[i] !== "settings") {
        return parts[i];
      }
    }
    return "general";
  };

  const activeTab = getActiveTab();

  // Get the current settings page title
  const getPageTitle = () => {
    switch(activeTab) {
      case "general": return "General";
      case "ai": return "AI";
      case "chat-interface": return "Interface";
      case "security": return "Security";
      case "leads": return "Leads";
      case "notifications": return "Notifications";
      case "custom-domains": return "Domains";
      case "usage": return "Usage";
      default: return "General";
    }
  };

  return (
    <AgentPageLayout defaultActiveTab="settings" defaultPageTitle={getPageTitle()} showPageTitle={false}>
      {/* Removed the overflow-hidden class to prevent auto-scrolling behavior */}
      <div className="flex flex-col p-8 bg-[#f5f5f5] w-full min-h-screen">
        <h1 className="text-3xl font-bold mb-6">{getPageTitle()}</h1>
        
        {/* Settings content */}
        <div className="bg-white rounded-lg p-6">
          <Routes>
            <Route path="/" element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="chat-interface" element={<ChatInterfaceSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="leads" element={<LeadsSettings />} />
            <Route path="notifications" element={<NotificationsSettings />} />
            <Route path="custom-domains" element={<CustomDomainsSettings />} />
            <Route path="usage" element={<div>Usage settings</div>} />
          </Routes>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default AgentSettingsPage;
