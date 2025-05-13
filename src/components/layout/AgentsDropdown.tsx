
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface AgentsDropdownProps {
  isActive: boolean;
}

const AgentsDropdown: React.FC<AgentsDropdownProps> = ({ isActive }) => {
  // Sample agents data to match the sidebar
  const agents = [
    {
      id: "1",
      name: "Wonder AI",
    },
    {
      id: "2",
      name: "Agora AI",
    },
    {
      id: "3",
      name: "PristineBag AI",
    },
    {
      id: "4",
      name: "AI Kundeservice",
    },
    {
      id: "5",
      name: "theballooncompany.com",
    }
  ];

  const [selectedAgent, setSelectedAgent] = useState<string>("Agents");
  const location = useLocation();
  
  // Check if we're on an agent page and extract the ID
  React.useEffect(() => {
    const match = location.pathname.match(/\/agent\/(\d+)/);
    if (match) {
      const agentId = match[1];
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setSelectedAgent(agent.name);
      }
    }
  }, [location.pathname]);

  const handleAgentSelect = (agentName: string) => {
    setSelectedAgent(agentName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={`px-3 py-2 rounded-md inline-flex items-center gap-1 ${isActive ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
      >
        {selectedAgent}
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {agents.map(agent => (
          <DropdownMenuItem key={agent.id} asChild>
            <Link 
              to={`/agent/${agent.id}`}
              onClick={() => handleAgentSelect(agent.name)}
            >
              {agent.name}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="border-t mt-1 pt-1">
          <Link 
            to="/dashboard" 
            onClick={() => handleAgentSelect("Agents")}
          >
            View All Agents
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AgentsDropdown;
