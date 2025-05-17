
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateAgentDialog from "./CreateAgentDialog";
import EditAgentDialog from "./EditAgentDialog";
import DeleteAgentDialog from "./DeleteAgentDialog";
import { useToast } from "@/hooks/use-toast";
import { Agent, Team } from "@/hooks/useTeamsAndAgents";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface AgentsListProps {
  agents: Agent[];
  teams: Team[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AgentsList = ({
  agents,
  teams,
  isExpanded,
  onToggleExpand
}: AgentsListProps) => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [localAgents, setLocalAgents] = useState<Agent[]>(agents);
  const { toast } = useToast();

  // Update local agents when props change
  useEffect(() => {
    setLocalAgents(agents);
  }, [agents]);

  // Handle creating a new agent
  const handleAgentCreated = (newAgent: Agent) => {
    setLocalAgents(prevAgents => [...prevAgents, newAgent]);
    toast({
      title: "Agent created",
      description: `${newAgent.name} has been created successfully.`
    });
  };

  // Handle agent navigation - FIXED NAVIGATION ISSUE
  const handleAgentClick = (agentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Navigating to agent:", agentId);
    
    // Direct navigation to the playground route
    navigate(`/playground/${agentId}`, { 
      state: { fromAgentsList: true } 
    });
  };

  // Functions to handle editing and deleting agents
  const openEditDialog = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setAgentToEdit(agent);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  // Handle editing a agent
  const handleAgentEdited = (updatedAgent: Agent) => {
    setLocalAgents(prevAgents => 
      prevAgents.map(agent => agent.id === updatedAgent.id ? updatedAgent : agent)
    );
  };

  // Handle deleting a agent
  const handleAgentDeleted = (agentId: string) => {
    setLocalAgents(prevAgents => 
      prevAgents.filter(agent => agent.id !== agentId)
    );
  };

  // Make sure we have at least one valid team with an ID
  const validTeams = teams.filter(team => team && team.id);
  const canCreateAgent = validTeams.length > 0;

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
          <div 
            key={agent.id}
            className="px-3 py-2 rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
            onClick={(e) => handleAgentClick(agent.id, e)}
          >
            <div className="flex items-center text-[0.875rem] flex-1">
              <div 
                className={`w-4 h-4 ${agent.color} rounded-sm mr-2 flex-shrink-0`}
              ></div>
              <span className="truncate">{agent.name}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1 text-gray-500 hover:text-gray-900"
                >
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-[0.875rem]" 
                  onClick={(e) => openEditDialog(agent, e as React.MouseEvent)}
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive text-[0.875rem]" 
                  onClick={(e) => openDeleteDialog(agent, e as React.MouseEvent)}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 justify-center text-sm"
          onClick={() => setIsDialogOpen(true)}
          disabled={!canCreateAgent}
        >
          <Plus className="h-4 w-4" />
          <span>Create agent</span>
        </Button>
      </div>

      <CreateAgentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        teams={validTeams}
        onAgentCreated={handleAgentCreated}
      />
      
      {agentToEdit && (
        <EditAgentDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          agent={agentToEdit}
          onAgentEdited={handleAgentEdited}
        />
      )}

      {agentToDelete && (
        <DeleteAgentDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          agent={agentToDelete}
          onAgentDeleted={handleAgentDeleted}
        />
      )}
    </div>
  );
};

export default AgentsList;
