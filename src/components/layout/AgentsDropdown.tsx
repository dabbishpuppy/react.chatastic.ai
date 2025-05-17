
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Bot, CircleCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentsDropdownProps {
  isActive: boolean;
  agents?: Array<{
    id: number | string;
    name: string;
    image?: string;
    color?: string;
    status?: string;
  }>;
}

const AgentsDropdown: React.FC<AgentsDropdownProps> = ({ isActive, agents = [] }) => {
  const [selectedAgent, setSelectedAgent] = useState<string>("Agents");
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on a playground page and extract the ID
  React.useEffect(() => {
    // Match both /agent/:id and /playground/:id paths for backward compatibility
    const match = location.pathname.match(/\/(?:agent|playground)\/([^\/]+)/);
    if (match) {
      const agentId = match[1];
      const agent = agents.find(a => a.id.toString() === agentId);
      if (agent) {
        setSelectedAgent(agent.name);
        setCurrentAgentId(agentId);
      }
    } else {
      setCurrentAgentId(null);
    }
  }, [location.pathname, agents]);

  const handleAgentSelect = (agent: { id: string | number, name: string }) => {
    setSelectedAgent(agent.name);
    setCurrentAgentId(agent.id.toString());
    
    // Navigate directly to the playground route
    navigate(`/playground/${agent.id}`, { 
      state: { fromAgentsList: true } 
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={`px-3 py-2 rounded-md inline-flex items-center gap-1.5 text-sm ${isActive ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
      >
        <Bot size={16} />
        {selectedAgent}
        <ChevronDown size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white">
        {agents.map(agent => (
          <DropdownMenuItem key={agent.id} onClick={() => handleAgentSelect(agent)} className="flex items-center justify-between text-[0.875rem] w-full">
            <div className="flex items-center gap-2">
              {agent.color && (
                <div className={`w-4 h-4 ${agent.color} rounded-sm flex-shrink-0`}></div>
              )}
              <span>{agent.name}</span>
            </div>
            {currentAgentId === agent.id.toString() && (
              <CircleCheck size={16} className="text-green-500" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="border-t mt-1 pt-1">
          <Link 
            to="/dashboard" 
            className="w-full"
          >
            <Button variant="outline" className="w-full bg-white text-primary border border-input flex items-center gap-1">
              <Plus size={14} />
              Create Agent
            </Button>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AgentsDropdown;
