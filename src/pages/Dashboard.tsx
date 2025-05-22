
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";
import EmptyDashboard from "@/components/dashboard/EmptyDashboard";
import LoadingDashboard from "@/components/dashboard/LoadingDashboard";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTeamsData } from "@/hooks/useTeamsData";
import { useTeamOperations } from "@/hooks/useTeamOperations";
import { useAgentOperations } from "@/hooks/useAgentOperations";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("agents");
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    agents: true
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Use our custom hooks
  const { teamsData, setTeamsData, selectedTeam, setSelectedTeam, loading } = useTeamsData();
  const { handleTeamCreated, handleTeamEdited, handleTeamDeleted } = useTeamOperations(
    teamsData, 
    setTeamsData, 
    selectedTeam, 
    setSelectedTeam
  );
  const { handleAgentCreated, handleAgentEdited, handleAgentDeleted } = useAgentOperations(
    teamsData, 
    setTeamsData, 
    selectedTeam, 
    setSelectedTeam
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "settings") {
      navigate("/settings/general");
    }
  };

  const handleTeamSelect = (team: any) => {
    setSelectedTeam(team);
    // Update the active state in the teams array
    setTeamsData(prev => prev.map(t => ({
      ...t,
      isActive: t.id === team.id
    })));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCreateTeamClick = () => {
    const createTeamButton = document.querySelector('[aria-label="Create team"]');
    if (createTeamButton instanceof HTMLElement) {
      createTeamButton.click();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile menu toggle */}
      {isMobile && (
        <div className="p-4 border-b border-gray-200 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu size={24} />
          </Button>
          <span className="font-medium">Dashboard</span>
        </div>
      )}

      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          teams={teamsData}
          selectedTeam={selectedTeam}
          expandedSections={expandedSections}
          onTeamSelect={handleTeamSelect}
          toggleSection={toggleSection}
          onTeamCreated={handleTeamCreated}
          onAgentCreated={handleAgentCreated}
          onTeamEdited={handleTeamEdited}
          onTeamDeleted={handleTeamDeleted}
          onAgentEdited={handleAgentEdited}
          onAgentDeleted={handleAgentDeleted}
          isMobileOpen={isMobileSidebarOpen}
          setMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Main content - with bg-[#f5f5f5] */}
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          {loading ? (
            <LoadingDashboard />
          ) : selectedTeam ? (
            <TeamDashboard 
              team={selectedTeam}
              teamsList={teamsData}
            />
          ) : (
            <EmptyDashboard onCreateTeamClick={handleCreateTeamClick} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
