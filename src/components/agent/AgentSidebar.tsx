
import React from "react";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Settings, 
  Zap,
  Share,
  Plus,
  DollarSign,
  User,
  LogOut
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
    } else if (tabId === "settings") {
      navigate(`/agent/${agentId}/settings`);
    }
    
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };

  const handleCreateAgent = () => {
    navigate("/dashboard/new-agent");
  };

  const handleUpgradeClick = () => {
    navigate("/settings/plans");
  };

  const handleMyAccountClick = () => {
    navigate("/settings/general");
  };

  const handleLogoutClick = () => {
    navigate("/signout");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pt-6">
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
      
      {/* New bottom section */}
      <div className="border-t p-4 space-y-4">
        {/* Usage Credits */}
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-sm font-medium text-gray-800">Usage Credits</div>
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-500">Free Plan</div>
            <div className="text-xs font-medium text-purple-600">5 left</div>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">0 of 5 used</div>
        </div>
        
        {/* Upgrade button */}
        <Button 
          onClick={handleUpgradeClick}
          className="w-full flex items-center justify-center"
          size="sm"
        >
          <DollarSign size={16} className="mr-1" />
          Upgrade
        </Button>
        
        {/* My Account and Logout */}
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start text-gray-700"
            size="sm"
            onClick={handleMyAccountClick}
          >
            <User size={16} className="mr-2" />
            My Account
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start text-gray-700"
            size="sm"
            onClick={handleLogoutClick}
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
