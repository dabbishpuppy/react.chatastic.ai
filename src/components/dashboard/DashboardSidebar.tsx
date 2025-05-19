
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
  id: number | string;
  name: string;
  image: string;
  color: string;
}

interface DashboardSidebarProps {
  teams: Team[];
  selectedTeam: Team | null;
  expandedSections: {
    teams: boolean;
    agents: boolean;
  };
  onTeamSelect: (team: Team) => void;
  toggleSection: (section: string) => void;
  onTeamCreated?: (team: Team) => void;
  onAgentCreated?: (agent: Agent) => void;
  onTeamEdited?: (team: Team) => void;
  onTeamDeleted?: (teamId: string) => void;
}

const DashboardSidebar = ({
  teams,
  selectedTeam,
  expandedSections,
  onTeamSelect,
  toggleSection,
  onTeamCreated,
  onAgentCreated,
  onTeamEdited,
  onTeamDeleted
}: DashboardSidebarProps) => {
  // Make sure we have a safe fallback for teams and agents
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeAgents = selectedTeam && Array.isArray(selectedTeam.agents) ? selectedTeam.agents : [];

  return (
    <div className="w-64 border-r border-gray-200 hidden md:flex md:flex-col">
      <div className="p-4 border-b border-gray-200">
        <Logo size="md" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <TeamsList 
            teams={safeTeams}
            selectedTeam={selectedTeam || safeTeams[0] || { id: "", name: "", isActive: false, agents: [] }}
            isExpanded={expandedSections.teams}
            onToggleExpand={() => toggleSection('teams')}
            onTeamSelect={onTeamSelect}
          />
          
          <AgentsList 
            agents={safeAgents}
            teams={safeTeams}
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
