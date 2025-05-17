
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateAgentDialog from "./CreateAgentDialog";

interface Agent {
  id: number;
  name: string;
  image: string;
  color: string;
  status?: string;
  teamId?: string;
  metrics?: {
    conversations: number;
    responseTime: string;
    satisfaction: number;
  };
}

interface Team {
  id: string;
  name: string;
}

interface AgentsListProps {
  agents: Agent[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  teams: Team[];
  currentTeamId?: string;
}

const AgentsList = ({
  agents,
  isExpanded,
  onToggleExpand,
  teams,
  currentTeamId
}: AgentsListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localAgents, setLocalAgents] = useState<Agent[]>(agents);

  // Handle creating a new agent
  const handleAgentCreated = (newAgent: Agent) => {
    setLocalAgents(prevAgents => [...prevAgents, newAgent]);
  };

  // Use local agents if available, otherwise use the props agents
  const displayAgents = localAgents.length > 0 ? localAgents : agents;

  return (
    <div className="mb-4">
      <button 
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-500 mb-2"
      >
        <span>Agents</span>
        <span className="transition-transform duration-200">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}>
        {displayAgents.map(agent => (
          <Link 
            to={`/agent/${agent.id}`}
            key={agent.id}
            className="px-3 py-2 rounded-md flex items-center text-[0.875rem] hover:bg-gray-50 transition-colors duration-200"
          >
            <div 
              className={`w-4 h-4 ${agent.color} rounded-sm mr-2 flex-shrink-0`}
            ></div>
            <span className="truncate">{agent.name}</span>
          </Link>
        ))}
      </div>

      <div className="mt-2">
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 justify-center text-sm"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Create agent</span>
        </Button>
      </div>

      <CreateAgentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAgentCreated={handleAgentCreated}
        teams={teams}
      />
    </div>
  );
};

export default AgentsList;
