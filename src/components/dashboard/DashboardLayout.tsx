
import React, { useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";
import AgentEmptyState from "@/components/dashboard/AgentEmptyState";
import { Team } from "@/hooks/useTeamsAndAgents";

interface DashboardLayoutProps {
  teamsData: Team[];
  selectedTeam: Team | null;
  expandedSections: {
    teams: boolean;
    agents: boolean;
  };
  onTeamSelect: (team: Team) => void;
  toggleSection: (section: string) => void;
  onTeamCreated: (team: any) => void;
  onAgentCreated: (agent: any) => void;
  onTeamEdited: (team: any) => void;
  onTeamDeleted: (teamId: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  teamsData,
  selectedTeam,
  expandedSections,
  onTeamSelect,
  toggleSection,
  onTeamCreated,
  onAgentCreated,
  onTeamEdited,
  onTeamDeleted
}) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          teams={teamsData}
          selectedTeam={selectedTeam}
          expandedSections={expandedSections}
          onTeamSelect={onTeamSelect}
          toggleSection={toggleSection}
          onTeamCreated={onTeamCreated}
          onAgentCreated={onAgentCreated}
          onTeamEdited={onTeamEdited}
          onTeamDeleted={onTeamDeleted}
        />

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          {selectedTeam && selectedTeam.agents.length > 0 ? (
            <TeamDashboard 
              team={selectedTeam}
              teamsList={teamsData}
            />
          ) : (
            <AgentEmptyState teamName={selectedTeam?.name} onCreateAgent={onAgentCreated} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
