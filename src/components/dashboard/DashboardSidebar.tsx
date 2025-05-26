import React from "react";
import TeamsList from "./TeamsList";
import AgentsList from "./AgentsList";
import SidebarActions from "./SidebarActions";
import Logo from "@/components/layout/Logo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Agent, Team } from "@/types/dashboard";
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
  onAgentCreated?: (agent: Omit<Agent, "id">) => void;
  onTeamEdited?: (team: Team) => void;
  onTeamDeleted?: (teamId: string) => void;
  onAgentEdited?: (agent: Agent) => void;
  onAgentDeleted?: (agentId: string) => void;
  isMobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
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
  onTeamDeleted,
  onAgentEdited,
  onAgentDeleted,
  isMobileOpen = false,
  setMobileOpen
}: DashboardSidebarProps) => {
  const teamsArray = Array.isArray(teams) ? teams : [];
  const activeTeam = selectedTeam || (teamsArray.length > 0 ? teamsArray[0] : null);
  const isMobile = useIsMobile();
  const sidebarContent = <>
      <div className="p-4 border-b border-gray-200 bg-white">
        <Logo size="md" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <TeamsList teams={teamsArray} selectedTeam={activeTeam} isExpanded={expandedSections.teams} onToggleExpand={() => toggleSection('teams')} onTeamSelect={team => {
          onTeamSelect(team);
          if (isMobile && setMobileOpen) {
            setMobileOpen(false);
          }
        }} onTeamCreated={onTeamCreated} onTeamEdited={onTeamEdited} onTeamDeleted={onTeamDeleted} />
          
          {activeTeam && <AgentsList agents={activeTeam.agents || []} teams={teamsArray} isExpanded={expandedSections.agents} onToggleExpand={() => toggleSection('agents')} onAgentCreated={onAgentCreated} onAgentEdited={onAgentEdited} onAgentDeleted={onAgentDeleted} />}
        </div>
      </div>
      
      <SidebarActions />
    </>;
  if (isMobile) {
    return <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <div className="flex flex-col h-full">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>;
  }
  return <div className="w-64 border-r border-gray-200 hidden md:flex md:flex-col">
      {sidebarContent}
    </div>;
};
export default DashboardSidebar;