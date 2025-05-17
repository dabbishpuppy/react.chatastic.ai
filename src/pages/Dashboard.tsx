
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamsAndAgents } from "@/hooks/useTeamsAndAgents";
import { useTeamManagement } from "@/components/dashboard/TeamManagement";
import { useAgentManagement } from "@/components/dashboard/AgentManagement";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TeamEmptyState from "@/components/dashboard/TeamEmptyState";

const Dashboard = () => {
  const navigate = useNavigate();
  
  // State for expanded sidebar sections
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    agents: true
  });
  
  // Fetch teams and agents data
  const { 
    teamsData, 
    setTeamsData, 
    selectedTeam, 
    setSelectedTeam, 
    loading 
  } = useTeamsAndAgents();
  
  // Team management functions
  const { 
    handleTeamSelect, 
    handleTeamCreated, 
    handleTeamEdited, 
    handleTeamDeleted 
  } = useTeamManagement({
    teamsData,
    setTeamsData,
    selectedTeam,
    setSelectedTeam
  });
  
  // Agent management functions
  const { handleAgentCreated } = useAgentManagement({
    selectedTeam,
    teamsData,
    setTeamsData,
    setSelectedTeam
  });
  
  // Toggle sidebar sections
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If there are no teams, show the empty state
  if (teamsData.length === 0) {
    return <TeamEmptyState onCreateTeam={handleTeamCreated} />;
  }

  return (
    <DashboardLayout
      teamsData={teamsData}
      selectedTeam={selectedTeam}
      expandedSections={expandedSections}
      onTeamSelect={handleTeamSelect}
      toggleSection={toggleSection}
      onTeamCreated={handleTeamCreated}
      onAgentCreated={handleAgentCreated}
      onTeamEdited={handleTeamEdited}
      onTeamDeleted={handleTeamDeleted}
    />
  );
};

export default Dashboard;
