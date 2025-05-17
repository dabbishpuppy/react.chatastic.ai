
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AgentSidebarMenu from "./sidebar/AgentSidebarMenu";
import SidebarActions from "../dashboard/SidebarActions";
import { useTeamsAndAgents, Agent } from "@/hooks/useTeamsAndAgents";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const { teamsData } = useTeamsAndAgents();
  
  // Find the current agent based on the URL parameter with proper cleanup
  useEffect(() => {
    // Reset current agent when agentId changes
    setCurrentAgent(null);
    
    if (agentId && teamsData.length > 0) {
      // Search through all teams to find the agent with matching ID
      for (const team of teamsData) {
        const foundAgent = team.agents.find(agent => agent.id.toString() === agentId);
        if (foundAgent) {
          console.log("Found agent:", foundAgent.name);
          setCurrentAgent(foundAgent);
          break;
        }
      }
    }
  }, [agentId, teamsData]);

  return (
    <div className="flex flex-col h-full">
      {/* Agent header section */}
      {currentAgent ? (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 ${currentAgent.color} rounded-sm flex-shrink-0`}></div>
            <span className="font-medium truncate">{currentAgent.name}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <div className="animate-pulse h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      )}
      
      <AgentSidebarMenu activeTab={activeTab} onTabChange={onTabChange} />
      <SidebarActions />
    </div>
  );
};

export default AgentSidebar;
