
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
import AvatarSettings from "@/components/agent/settings/AvatarSettings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Bot,
  LayoutTemplate,
  Shield,
  Users,
  Bell,
  Globe,
  UserRound
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AgentSettingsPage: React.FC = () => {
  const { agentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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

  const menuItems = [
    { id: "general", label: "General", icon: <Settings size={16} className="mr-2" /> },
    { id: "ai", label: "AI", icon: <Bot size={16} className="mr-2" /> },
    { id: "avatar", label: "Avatar", icon: <UserRound size={16} className="mr-2" /> },
    { id: "chat-interface", label: "Interface", icon: <LayoutTemplate size={16} className="mr-2" /> },
    { id: "security", label: "Security", icon: <Shield size={16} className="mr-2" /> },
    { id: "leads", label: "Leads", icon: <Users size={16} className="mr-2" /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} className="mr-2" /> },
    { id: "custom-domains", label: "Domains", icon: <Globe size={16} className="mr-2" /> },
  ];

  const activeTab = getActiveTab();

  const handleTabChange = (tabId: string) => {
    navigate(`/agent/${agentId}/settings/${tabId}`);
  };

  return (
    <AgentPageLayout defaultActiveTab="" defaultPageTitle="Settings">
      <div className="flex flex-col p-6 bg-[#f5f5f5] -m-6 overflow-hidden w-full">
        {/* Horizontal Tabs */}
        <div className="bg-white p-2 rounded-lg mb-6 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex justify-start bg-gray-50 p-1 overflow-x-auto hide-scrollbar">
              {menuItems.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="flex items-center data-[state=active]:bg-white whitespace-nowrap flex-shrink-0"
                >
                  {item.icon}
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Settings content */}
        <div className="flex-1 overflow-auto">
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
