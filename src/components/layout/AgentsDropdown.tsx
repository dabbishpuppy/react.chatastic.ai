
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
}

// This should match the structure in Dashboard.tsx for consistency
const agentsByTeam = {
  "1": [  // Wonderwave team
    {
      id: "1",
      name: "Wonder AI",
    },
    {
      id: "2",
      name: "Agora AI",
    },
  ],
  "2": [  // Analytics team
    {
      id: "3",
      name: "PristineBag AI",
    },
    {
      id: "4",
      name: "AI Kundeservice",
    },
  ],
  "3": [  // Support team
    {
      id: "5",
      name: "theballooncompany.com",
    }
  ]
};

// Default team is Wonderwave (id: 1)
const defaultTeamId = "1";

const AgentsDropdown: React.FC<AgentsDropdownProps> = ({ isActive }) => {
  // Combine all agents for the dropdown
  const allAgents = Object.values(agentsByTeam).flat();
  
  const [selectedAgent, setSelectedAgent] = useState<string>("Agents");
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const location = useLocation();
  
  // Check if we're on an agent page and extract the ID
  React.useEffect(() => {
    const match = location.pathname.match(/\/agent\/(\d+)/);
    if (match) {
      const agentId = match[1];
      const agent = allAgents.find(a => a.id === agentId);
      if (agent) {
        setSelectedAgent(agent.name);
        setCurrentAgentId(agentId);
      }
    } else {
      setCurrentAgentId(null);
    }
  }, [location.pathname]);

  const handleAgentSelect = (agentName: string) => {
    setSelectedAgent(agentName);
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
      <DropdownMenuContent className="w-56">
        {allAgents.map(agent => (
          <DropdownMenuItem key={agent.id} asChild>
            <Link 
              to={`/agent/${agent.id}`}
              onClick={() => handleAgentSelect(agent.name)}
              className="flex items-center justify-between text-[0.875rem] w-full"
            >
              {agent.name}
              {currentAgentId === agent.id && (
                <CircleCheck size={16} className="text-green-500" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="border-t mt-1 pt-1">
          <Link 
            to="/dashboard" 
            onClick={() => handleAgentSelect("Agents")}
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
