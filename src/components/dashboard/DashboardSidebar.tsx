
import React from "react";
import TeamsList from "./TeamsList";
import AgentsList from "./AgentsList";
import SidebarActions from "./SidebarActions";
import Logo from "@/components/layout/Logo";

interface Team {
  id: string;
  name: string;
  isActive: boolean;
  agents: Agent[];
}

interface Agent {
  id: number;
  name: string;
  image: string;
  color: string;
}

interface DashboardSidebarProps {
  teams: Team[];
  selectedTeam: Team;
  expandedSections: {
    teams: boolean;
    agents: boolean;
  };
  onTeamSelect: (team: Team) => void;
  toggleSection: (section: string) => void;
  onTeamCreated?: (team: Team) => void;
  onAgentCreated?: (agent: Agent) => void;
}

const DashboardSidebar = ({
  teams,
  selectedTeam,
  expandedSections,
  onTeamSelect,
  toggleSection,
  onTeamCreated,
  onAgentCreated
}: DashboardSidebarProps) => {
  return (
    <div className="w-64 border-r border-gray-200 hidden md:flex md:flex-col">
      <div className="p-4 border-b border-gray-200">
        <Logo size="md" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <TeamsList 
            teams={teams}
            selectedTeam={selectedTeam}
            isExpanded={expandedSections.teams}
            onToggleExpand={() => toggleSection('teams')}
            onTeamSelect={onTeamSelect}
          />
          
          <AgentsList 
            agents={selectedTeam.agents}
            isExpanded={expandedSections.agents}
            onToggleExpand={() => toggleSection('agents')}
          />
        </div>
      </div>
      
      <SidebarActions />
    </div>
  );
};

export default DashboardSidebar;
