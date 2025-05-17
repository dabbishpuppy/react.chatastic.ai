
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
  
  // Check if we're on an agent page and extract the ID
  React.useEffect(() => {
    const match = location.pathname.match(/\/agent\/(\d+|[0-9a-f-]+)/);
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

  const handleAgentSelect = (agent: { id: number | string; name: string }) => {
    setSelectedAgent(agent.name);
    navigate(`/agent/${agent.id}`, { replace: true });
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
          <DropdownMenuItem key={agent.id} asChild>
            <button
              onClick={() => handleAgentSelect(agent)}
              className="flex w-full items-center justify-between text-[0.875rem]"
            >
              <div className="flex items-center gap-2">
                {agent.color && (
                  <div className={`w-4 h-4 ${agent.color} rounded-sm flex-shrink-0`}></div>
                )}
                <span>{agent.name}</span>
              </div>
              {currentAgentId === agent.id.toString() && (
                <CircleCheck size={16} className="text-green-500" />
              )}
            </button>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="border-t mt-1 pt-1">
          <Link 
            to="/dashboard" 
            onClick={() => setSelectedAgent("Agents")}
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
