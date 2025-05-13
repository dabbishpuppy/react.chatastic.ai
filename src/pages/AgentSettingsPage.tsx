
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentPageLayout from "@/pages/AgentPageLayout";
import AgentGeneralSettings from "@/components/agent/settings/GeneralSettings";
import AISettings from "@/components/agent/settings/AISettings";
import ChatInterfaceSettings from "@/components/agent/settings/ChatInterfaceSettings";
import SecuritySettings from "@/components/agent/settings/SecuritySettings";
import LeadsSettings from "@/components/agent/settings/LeadsSettings";
import NotificationsSettings from "@/components/agent/settings/NotificationsSettings";
import CustomDomainsSettings from "@/components/agent/settings/CustomDomainsSettings";
import { 
  Settings, 
  Bot, 
  LayoutTemplate, 
  Shield, 
  Users, 
  Bell, 
  Globe 
} from "lucide-react";

const AgentSettingsPage: React.FC = () => {
  const { agentId, settingsTab = "general" } = useParams();
  const navigate = useNavigate();
  
  const tabs = [
    { id: "general", label: "General", icon: <Settings className="w-4 h-4 mr-2" /> },
    { id: "ai", label: "AI", icon: <Bot className="w-4 h-4 mr-2" /> },
    { id: "chat-interface", label: "Interface", icon: <LayoutTemplate className="w-4 h-4 mr-2" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4 mr-2" /> },
    { id: "leads", label: "Leads", icon: <Users className="w-4 h-4 mr-2" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-5 h-5 mr-2" /> },
    { id: "custom-domains", label: "Domains", icon: <Globe className="w-4 h-4 mr-2" /> },
  ];

  const handleTabChange = (value: string) => {
    navigate(`/agent/${agentId}/settings/${value}`);
  };

  // Render the appropriate component based on the current tab
  const renderTabContent = () => {
    switch (settingsTab) {
      case "general":
        return <AgentGeneralSettings />;
      case "ai":
        return <AISettings />;
      case "chat-interface":
        return <ChatInterfaceSettings />;
      case "security":
        return <SecuritySettings />;
      case "leads":
        return <LeadsSettings />;
      case "notifications":
        return <NotificationsSettings />;
      case "custom-domains":
        return <CustomDomainsSettings />;
      default:
        return <AgentGeneralSettings />;
    }
  };

  return (
    <AgentPageLayout defaultActiveTab="settings" defaultPageTitle="Settings">
      <div className="max-w-4xl w-full">
        <Tabs value={settingsTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center">
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="mt-6">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>
    </AgentPageLayout>
  );
};

export default AgentSettingsPage;
