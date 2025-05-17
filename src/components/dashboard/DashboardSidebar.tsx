
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
  teams: any[];
  selectedTeam: any;
  expandedSections: {
    teams: boolean;
    agents: boolean;
  };
  onTeamSelect: (team: any) => void;
  toggleSection: (section: string) => void;
  onTeamCreated: (team: any) => void;
  onAgentCreated: (agent: any) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  teams,
  selectedTeam,
  expandedSections,
  onTeamSelect,
  toggleSection,
  onTeamCreated,
  onAgentCreated
}) => {
  return (
    <div className="flex flex-col w-64 border-r border-gray-200 bg-white p-4 h-screen overflow-y-auto">
      <div className="flex items-center h-12 mb-6">
        <Logo />
      </div>
      
      <div className="flex-1 space-y-1">
        <TeamsList
          teams={teams}
          selectedTeam={selectedTeam}
          isExpanded={expandedSections.teams}
          onToggleExpand={() => toggleSection("teams")}
          onTeamSelect={onTeamSelect}
        />
        
        <AgentsList
          agents={selectedTeam?.agents || []}
          isExpanded={expandedSections.agents}
          onToggleExpand={() => toggleSection("agents")}
          teams={teams}
          currentTeamId={selectedTeam?.id}
        />
      </div>
      
      <SidebarActions />
    </div>
  );
};

export default DashboardSidebar;
