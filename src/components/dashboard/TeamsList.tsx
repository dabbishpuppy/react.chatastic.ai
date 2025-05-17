
import React from "react";
import { Link } from "react-router-dom";
import { Users, ChevronDown, ChevronUp, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Team {
  id: string;
  name: string;
  isActive: boolean;
}

interface TeamsListProps {
  teams: Team[];
  selectedTeam: Team;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTeamSelect: (team: Team) => void;
}

const TeamsList = ({
  teams,
  selectedTeam,
  isExpanded,
  onToggleExpand,
  onTeamSelect
}: TeamsListProps) => {
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
              selectedTeam.id === team.id 
                ? "bg-gray-100 font-medium" 
                : "hover:bg-gray-50"
            }`}
            onClick={() => onTeamSelect(team)}
          >
            <div className="flex items-center">
              <Users size={16} className="mr-2 text-gray-500" />
              <span className="text-[0.875rem]">{team.name}</span>
            </div>
            {team.isActive && (
              <CheckCircle size={16} className="text-green-500" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <Button variant="outline" className="w-full flex items-center gap-2 justify-center text-sm">
          <Plus className="h-4 w-4" />
          <span>Create team</span>
        </Button>
      </div>
    </div>
  );
};

export default TeamsList;
