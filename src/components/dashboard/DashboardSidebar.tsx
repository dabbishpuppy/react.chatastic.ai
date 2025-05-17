
import React from "react";
import TeamsList from "./TeamsList";
import AgentsList from "./AgentsList";
import SidebarActions from "./SidebarActions";
import Logo from "@/components/layout/Logo";
import { Team, Agent } from "@/hooks/useTeamsAndAgents";

interface DashboardSidebarProps {
  teams: Team[];
  selectedTeam: Team | null;
  expandedSections: {
    teams: boolean;
    agents: boolean;
  };
  onTeamSelect: (team: Team) => void;
  toggleSection: (section: string) => void;
  onTeamCreated?: (team: any) => void;
  onAgentCreated?: (agent: any) => void;
  onTeamEdited?: (team: any) => void;
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
          
          {selectedTeam && (
            <AgentsList 
              agents={selectedTeam.agents}
              teams={teams}
              isExpanded={expandedSections.agents}
              onToggleExpand={() => toggleSection('agents')}
            />
          )}
        </div>
      </div>
      
      <SidebarActions />
    </div>
  );
};

export default DashboardSidebar;
