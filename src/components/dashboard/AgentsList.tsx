
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateAgentDialog from "./CreateAgentDialog";
import EditAgentDialog from "./EditAgentDialog";
import DeleteAgentDialog from "./DeleteAgentDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Agent {
  id: string;
  name: string;
  image: string;
  color: string;
  status?: string;
  team_id?: string;
  metrics?: {
    conversations: number;
    responseTime: string;
    satisfaction: number;
  };
}

interface Team {
  id: string;
  name: string;
  isActive: boolean;
  agents: Agent[];
}

interface AgentsListProps {
  agents: Agent[];
  teams: Team[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAgentCreated?: (agent: Agent) => void;
  onAgentEdited?: (agent: Agent) => void;
  onAgentDeleted?: (agentId: string) => void;
}

const AgentsList = ({
  agents,
  teams,
  isExpanded,
  onToggleExpand,
  onAgentCreated,
  onAgentEdited,
  onAgentDeleted
}: AgentsListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const { toast } = useToast();

  // Handle creating a new agent
  const handleAgentCreated = (newAgent: Agent) => {
    if (onAgentCreated) {
      onAgentCreated(newAgent);
    }
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

  const handleAgentEdited = (updatedAgent: Agent) => {
    if (onAgentEdited) {
      onAgentEdited(updatedAgent);
    }
  };

  const handleAgentDeleted = (agentId: string) => {
    if (onAgentDeleted) {
      onAgentDeleted(agentId);
    }
  };

  const activeTeam = teams.find(team => team.isActive);

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
        {agents.map(agent => (
          <div 
            key={agent.id}
            className="px-3 py-2 rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
          >
            <Link 
              to={`/agent/${agent.id}`}
              className="flex items-center text-[0.875rem] flex-1"
            >
              <div 
                className={`w-4 h-4 ${agent.color} rounded-sm mr-2 flex-shrink-0`}
              ></div>
              <span className="truncate">{agent.name}</span>
            </Link>
            
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
          onClick={() => {
            if (!activeTeam) {
              toast({
                title: "No team selected",
                description: "Please select or create a team first",
                variant: "destructive",
              });
              return;
            }
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Create agent</span>
        </Button>
      </div>

      <CreateAgentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        teams={teams}
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
