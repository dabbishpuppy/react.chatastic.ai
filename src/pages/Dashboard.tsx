
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTeamsAndAgents } from "@/hooks/useTeamsAndAgents";
import { useTeamManagement } from "@/components/dashboard/TeamManagement";
import { useAgentManagement } from "@/components/dashboard/AgentManagement";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TeamEmptyState from "@/components/dashboard/TeamEmptyState";

const Dashboard = () => {
  const navigate = useNavigate();
  const { teamName } = useParams();
  
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
  
  // Set selected team based on URL parameter when teams are loaded
  useEffect(() => {
    if (!loading && teamsData.length > 0 && teamName) {
      const decodedTeamName = decodeURIComponent(teamName);
      // Find the team with the matching URL-friendly name
      const foundTeam = teamsData.find(team => 
        team.name.toLowerCase().replace(/\s+/g, '-') === decodedTeamName
      );
      
      if (foundTeam) {
        // Update active status for all teams
        setTeamsData(prevTeams => 
          prevTeams.map(team => ({
            ...team,
            isActive: team.id === foundTeam.id
          }))
        );
        setSelectedTeam(foundTeam);
      } else if (teamsData.length > 0) {
        // If team not found in URL but teams exist, navigate to the first team
        const firstTeam = teamsData[0];
        const firstTeamUrlName = encodeURIComponent(firstTeam.name.toLowerCase().replace(/\s+/g, '-'));
        navigate(`/dashboard/${firstTeamUrlName}`, { replace: true });
      }
    } else if (!loading && teamsData.length > 0 && !teamName) {
      // No team in URL but teams exist, navigate to first team
      const firstTeam = teamsData[0];
      const firstTeamUrlName = encodeURIComponent(firstTeam.name.toLowerCase().replace(/\s+/g, '-'));
      navigate(`/dashboard/${firstTeamUrlName}`, { replace: true });
    }
  }, [teamsData, loading, teamName, navigate]);
  
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
