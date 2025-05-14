
import React from "react";
import { 
  Settings, 
  Bot, 
  LayoutTemplate, 
  Shield, 
  Users, 
  Bell, 
  Globe,
  UserRound,
  Volume2,
  LineChart
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface AgentSettingsSidebarProps {
  activeTab: string;
}

const AgentSettingsSidebar: React.FC<AgentSettingsSidebarProps> = ({ activeTab }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();

  const menuItems = [
    { id: "general", label: "General", icon: <Settings size={18} /> },
    { id: "ai", label: "AI", icon: <Bot size={18} /> },
    { id: "avatar", label: "Avatar", icon: <UserRound size={18} /> },
    { id: "voice", label: "Voice", icon: <Volume2 size={18} /> },
    { id: "chat-interface", label: "Interface", icon: <LayoutTemplate size={18} /> },
    { id: "security", label: "Security", icon: <Shield size={18} /> },
    { id: "usage", label: "Usage", icon: <LineChart size={18} /> },
    { id: "leads", label: "Leads", icon: <Users size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { id: "custom-domains", label: "Domains", icon: <Globe size={18} /> },
  ];

  const handleClick = (tabId: string) => {
    navigate(`/agent/${agentId}/settings/${tabId}`);
  };

  return (
    <div className="pb-6">
      {menuItems.map((item) => (
        <button
          key={item.id}
          className={`w-full flex items-center px-6 py-2.5 text-sm ${
            activeTab === item.id
              ? "bg-gray-100 font-medium"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => handleClick(item.id)}
        >
          <span className="mr-3 text-gray-500">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default AgentSettingsSidebar;
