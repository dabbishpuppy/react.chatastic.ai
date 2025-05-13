
import React from "react";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Plus, 
  Settings, 
  Users, 
  Zap, 
  Link as LinkIcon
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();

  const menuItems = [
    { id: "playground", label: "Playground", icon: <FileText size={18} /> },
    { id: "activity", label: "Activity", icon: <Activity size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
    { id: "sources", label: "Sources", icon: <FileText size={18} /> },
    { id: "actions", label: "Actions", icon: <Zap size={18} />, badge: "New" },
    { id: "contacts", label: "Contacts", icon: <Users size={18} />, badge: "New" },
    { id: "connect", label: "Connect", icon: <LinkIcon size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const handleClick = (tabId: string) => {
    onTabChange(tabId);
    
    if (tabId === "activity") {
      navigate(`/agent/${agentId}/activity`);
    } else if (tabId === "playground") {
      navigate(`/agent/${agentId}`);
    } else if (tabId === "analytics") {
      navigate(`/agent/${agentId}/analytics`);
    } else if (tabId === "sources") {
      navigate(`/agent/${agentId}/sources`);
    }
    // Other tabs can be added as they are implemented
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
          {item.badge && (
            <span className="ml-auto px-1.5 py-0.5 text-xs bg-violet-600 text-white rounded">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default AgentSidebar;
