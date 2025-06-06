import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronDown, ChevronUp, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateTeamDialog from "./CreateTeamDialog";
import EditTeamDialog from "./EditTeamDialog";
import DeleteTeamDialog from "./DeleteTeamDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Team } from "@/types/dashboard";

interface TeamsListProps {
  teams: Team[];
  selectedTeam: Team | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTeamSelect: (team: Team) => void;
  onTeamCreated?: (team: Omit<Team, 'id' | 'isActive' | 'agents' | 'metrics'>) => void;
  onTeamEdited?: (team: Team) => void;
  onTeamDeleted?: (teamId: string) => void;
}

const TeamsList = ({
  teams,
  selectedTeam,
  isExpanded,
  onToggleExpand,
  onTeamSelect,
  onTeamCreated,
  onTeamEdited,
  onTeamDeleted
}: TeamsListProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  // Open the edit dialog
  const openEditDialog = (team: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    setTeamToEdit(team);
    setIsEditDialogOpen(true);
  };

  // Open the delete dialog
  const openDeleteDialog = (team: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    setTeamToDelete(team);
    setIsDeleteDialogOpen(true);
  };

  // Handle creating a new team
  const handleTeamCreated = (newTeam: Omit<Team, 'id' | 'isActive' | 'agents' | 'metrics'>) => {
    if (onTeamCreated) {
      onTeamCreated(newTeam);
    }
  };

  // Handle editing a team
  const handleTeamEdited = (updatedTeam: Team) => {
    if (onTeamEdited) {
      onTeamEdited(updatedTeam);
    }
  };

  // Handle deleting a team
  const handleTeamDeleted = (teamId: string) => {
    if (onTeamDeleted) {
      onTeamDeleted(teamId);
    }
  };

  return (
    <div className="mb-4">
      <button 
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-500 mb-2"
      >
        <span>Teams</span>
        <span className="transition-transform duration-200">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}>
        {teams.map(team => (
          <div 
            key={team.id}
            className={`px-3 py-2 rounded-md flex items-center justify-between cursor-pointer transition-colors duration-200 ${
              selectedTeam?.id === team.id 
                ? "bg-gray-100 font-medium" 
                : "hover:bg-gray-50"
            }`}
            onClick={() => onTeamSelect(team)}
          >
            <div className="flex items-center">
              <Users size={16} className="mr-2 text-gray-500" />
              <span className="text-[0.875rem]">{team.name}</span>
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
                  onClick={(e) => openEditDialog(team, e as React.MouseEvent)}
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive text-[0.875rem]" 
                  onClick={(e) => openDeleteDialog(team, e as React.MouseEvent)}
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
          onClick={() => setIsCreateDialogOpen(true)}
          aria-label="Create team"
        >
          <Plus className="h-4 w-4" />
          <span>Create team</span>
        </Button>
      </div>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTeamCreated={handleTeamCreated}
      />

      {teamToEdit && (
        <EditTeamDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          team={teamToEdit}
          onTeamEdited={handleTeamEdited}
        />
      )}

      {teamToDelete && (
        <DeleteTeamDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          team={teamToDelete}
          onTeamDeleted={handleTeamDeleted}
        />
      )}
    </div>
  );
};

export default TeamsList;
