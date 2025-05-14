
import React from "react";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Settings, 
  Zap,
  Share,
  Plus,
  Link
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button
} from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();

  const menuItems = [
    { id: "playground", label: "Playground", icon: <FileText size={18} /> },
    { id: "activity", label: "Activity", icon: <Activity size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
    { id: "sources", label: "Sources", icon: <FileText size={18} /> },
    { id: "actions", label: "Actions", icon: <Zap size={18} /> },
    { id: "connect", label: "Connect", icon: <Share size={18} /> },
    { id: "integrations", label: "Integrations", icon: <Link size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const handleClick = (tabId: string, tabLabel: string) => {
    onTabChange(tabId, tabLabel);
    
    if (tabId === "activity") {
      navigate(`/agent/${agentId}/activity`);
    } else if (tabId === "playground") {
      navigate(`/agent/${agentId}`);
    } else if (tabId === "analytics") {
      navigate(`/agent/${agentId}/analytics`);
    } else if (tabId === "sources") {
      navigate(`/agent/${agentId}/sources`);
    } else if (tabId === "actions") {
      navigate(`/agent/${agentId}/actions`);
    } else if (tabId === "connect") {
      navigate(`/agent/${agentId}/integrations`);
    } else if (tabId === "integrations") {
      navigate(`/agent/${agentId}/integrations`);
    } else if (tabId === "settings") {
      navigate(`/agent/${agentId}/settings`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation menu with section label */}
      <div className="pt-4 px-4">
        <Label className="text-sm font-medium text-gray-500">
          Agent Menu
        </Label>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`w-full flex items-center px-6 py-2.5 text-sm ${
              activeTab === item.id
                ? "bg-gray-100 font-medium"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => handleClick(item.id, item.label)}
          >
            <span className="mr-3 text-gray-500">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AgentSidebar;
