
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const TeamsDropdown: React.FC = () => {
  // Sample teams data
  const teams = [
    {
      id: "1",
      name: "Wonderwave",
      active: true,
    },
    {
      id: "2",
      name: "Analytics Team",
      active: false,
    },
    {
      id: "3",
      name: "Support Team",
      active: false,
    }
  ];

  const [selectedTeam, setSelectedTeam] = useState<string>("Teams");
  const location = useLocation();
  
  // Check if we're on a team page and extract the ID
  React.useEffect(() => {
    const match = location.pathname.match(/\/team\/(\d+)/);
    if (match) {
      const teamId = match[1];
      const team = teams.find(t => t.id === teamId);
      if (team) {
        setSelectedTeam(team.name);
      }
    }
  }, [location.pathname]);

  const handleTeamSelect = (teamName: string) => {
    setSelectedTeam(teamName);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="px-3 py-2 rounded-md inline-flex items-center gap-1 hover:bg-accent/30">
        {selectedTeam}
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {teams.map(team => (
          <DropdownMenuItem key={team.id} asChild>
            <Link 
              to={`/team/${team.id}`}
              onClick={() => handleTeamSelect(team.name)}
              className="flex items-center justify-between"
            >
              {team.name}
              {team.active && <span>✓</span>}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="border-t mt-1 pt-1">
          <Link 
            to="/teams/create" 
            onClick={() => handleTeamSelect("Teams")}
          >
            Create Team
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TeamsDropdown;
