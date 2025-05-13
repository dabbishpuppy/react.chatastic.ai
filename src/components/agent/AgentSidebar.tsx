
import React from "react";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Settings, 
  Zap,
  Share,
  Plus
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();

  // Use the same agent data as shown on the Dashboard
  const agents = [
    {
      id: "1",
      name: "Wonder AI",
      image: "/placeholder.svg",
      color: "bg-violet-600",
    },
    {
      id: "2",
      name: "Agora AI",
      image: "/placeholder.svg", 
      color: "bg-amber-100",
    },
    {
      id: "3",
      name: "PristineBag AI",
      image: "/placeholder.svg",
      color: "bg-rose-400",
    },
    {
      id: "4",
      name: "AI Kundeservice",
      image: "/placeholder.svg",
      color: "bg-black",
    },
    {
      id: "5",
      name: "theballooncompany.com",
      image: "/placeholder.svg",
      color: "bg-white",
    }
  ];

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
  };

  const handleAgentChange = (value: string) => {
    navigate(`/agent/${value}`);
  };

  const handleCreateAgent = () => {
    navigate("/dashboard/new-agent");
  };

  return (
    <div className="pb-6 flex flex-col h-full">
      {/* Agent selector dropdown at the top */}
      <div className="p-4 border-b bg-gray-50">
        <Select defaultValue={agentId} onValueChange={handleAgentChange}>
          <SelectTrigger className="w-full bg-white text-black border border-gray-200">
            <SelectValue placeholder="Select an agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
            <div className="py-2 px-2 border-t mt-1">
              <Button 
                onClick={handleCreateAgent} 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Create New Agent
              </Button>
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 overflow-y-auto">
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
