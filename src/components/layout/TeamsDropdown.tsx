
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Users, CircleCheck, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Same teams data as in Dashboard
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

const TeamsDropdown: React.FC = () => {
  const defaultTeam = teams.find(t => t.active) || teams[0];
  const [selectedTeam, setSelectedTeam] = useState<string>(defaultTeam.name);
  const location = useLocation();
  
  // Check if we're on a team page and extract the ID
  useEffect(() => {
    const match = location.pathname.match(/\/team\/(\d+)/);
    if (match) {
      const teamId = match[1];
      const team = teams.find(t => t.id === teamId);
      if (team) {
        setSelectedTeam(team.name);
      }
    } else if (location.pathname.includes('/agent/')) {
      // If we're on an agent page and no team is explicitly selected,
      // default to the active team or first team
      setSelectedTeam(defaultTeam.name);
    }
  }, [location.pathname]);

  const handleTeamSelect = (teamName: string) => {
    setSelectedTeam(teamName);
    toast({
      title: "Team selected",
      description: `You switched to ${teamName}`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={`px-3 py-2 rounded-md inline-flex items-center gap-1.5 hover:bg-accent/30 text-sm`}
      >
        <Users size={16} />
        {selectedTeam}
        <ChevronDown size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {teams.map(team => (
          <DropdownMenuItem key={team.id} asChild>
            <Link 
              to={`/team/${team.id}`}
              onClick={() => handleTeamSelect(team.name)}
              className="flex items-center justify-between text-[0.875rem]"
            >
              {team.name}
              {team.active && <CircleCheck size={16} className="text-green-500" />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="border-t mt-1 pt-1">
          <Link 
            to="/teams/create" 
            onClick={() => setSelectedTeam("Teams")}
            className="w-full"
          >
            <Button variant="outline" className="w-full bg-white text-primary border border-input flex items-center gap-1">
              <Plus size={14} />
              Create Team
            </Button>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TeamsDropdown;
