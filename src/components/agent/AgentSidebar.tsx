
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, User, LogOut } from "lucide-react";
import AgentSidebarMenu from "./sidebar/AgentSidebarMenu";
import SidebarActions from "../dashboard/SidebarActions";
import { ScrollArea } from "@/components/ui/scroll-area";

// Sample agent data structure - in a real implementation, this would come from a data store or API
const agentsData = [
  {
    id: "1",
    name: "Wonder AI",
    color: "bg-violet-600",
  },
  {
    id: "2",
    name: "Agora AI",
    color: "bg-amber-100",
  },
  {
    id: "3",
    name: "PristineBag AI",
    color: "bg-rose-400",
  },
  {
    id: "4",
    name: "AI Kundeservice",
    color: "bg-black",
  },
  {
    id: "5",
    name: "theballooncompany.com",
    color: "bg-white",
  }
];

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const { agentId } = useParams();
  const [currentAgent, setCurrentAgent] = useState<{id: string, name: string, color: string} | null>(null);

  // Find the current agent based on the URL parameter
  useEffect(() => {
    if (agentId) {
      const agent = agentsData.find(agent => agent.id === agentId);
      if (agent) {
        setCurrentAgent(agent);
      }
    }
  }, [agentId]);

  return (
    <div className="flex flex-col h-full">
      {/* Agent header section */}
      {currentAgent && (
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 ${currentAgent.color} rounded-sm flex-shrink-0`}></div>
            <span className="font-medium truncate">{currentAgent.name}</span>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1 overflow-y-auto">
        <AgentSidebarMenu activeTab={activeTab} onTabChange={onTabChange} />
      </ScrollArea>
      
      <div className="flex-shrink-0">
        <SidebarActions />
      </div>
    </div>
  );
};

export default AgentSidebar;
