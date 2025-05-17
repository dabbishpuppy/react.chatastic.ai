import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";
import Logo from "@/components/layout/Logo";
import TeamsList from "@/components/dashboard/TeamsList";
import AgentsList from "@/components/dashboard/AgentsList";
import SidebarActions from "@/components/dashboard/SidebarActions";

// Sample data structure for teams and their agents
const initialTeamsData = [
  {
    id: "1",
    name: "Wonderwave",
    isActive: true,
    agents: [
      {
        id: 1,
        name: "Wonder AI",
        image: "/placeholder.svg",
        color: "bg-violet-600",
        status: "active",
        metrics: {
          conversations: 253,
          responseTime: "1.2s",
          satisfaction: 94,
        }
      },
      {
        id: 2,
        name: "Agora AI",
        image: "/placeholder.svg", 
        color: "bg-amber-100",
        status: "active",
        metrics: {
          conversations: 187,
          responseTime: "0.9s",
          satisfaction: 91,
        }
      },
    ],
    metrics: {
      totalConversations: 440,
      avgResponseTime: "1.1s",
      usagePercent: 68,
      apiCalls: 12450,
      satisfaction: 92,
    }
  },
  {
    id: "2",
    name: "Analytics Team",
    isActive: false,
    agents: [
      {
        id: 3,
        name: "PristineBag AI",
        image: "/placeholder.svg",
        color: "bg-rose-400",
        status: "inactive",
        metrics: {
          conversations: 134,
          responseTime: "1.5s",
          satisfaction: 87,
        }
      },
      {
        id: 4,
        name: "AI Kundeservice",
        image: "/placeholder.svg",
        color: "bg-black",
        status: "active",
        metrics: {
          conversations: 219,
          responseTime: "1.3s",
          satisfaction: 89,
        }
      },
    ],
    metrics: {
      totalConversations: 353,
      avgResponseTime: "1.4s",
      usagePercent: 54,
      apiCalls: 8930,
      satisfaction: 88,
    }
  },
  {
    id: "3",
    name: "Support Team",
    isActive: false,
    agents: [
      {
        id: 5,
        name: "theballooncompany.com",
        image: "/placeholder.svg",
        color: "bg-white",
        status: "active",
        metrics: {
          conversations: 178,
          responseTime: "1.0s",
          satisfaction: 95,
        }
      }
    ],
    metrics: {
      totalConversations: 178,
      avgResponseTime: "1.0s",
      usagePercent: 32,
      apiCalls: 4250,
      satisfaction: 95,
    }
  }
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("agents");
  const [teamsData, setTeamsData] = useState(initialTeamsData);
  const [selectedTeam, setSelectedTeam] = useState(() => {
    return teamsData.find(team => team.isActive) || teamsData[0];
  });
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    agents: true
  });
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "settings") {
      navigate("/settings/general");
    }
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTeamCreated = (newTeam) => {
    setTeamsData(prevTeams => [...prevTeams, newTeam]);
    setSelectedTeam(newTeam);
  };

  const handleAgentCreated = (newAgent) => {
    // Add the new agent to the currently selected team
    setTeamsData(prevTeams => prevTeams.map(team => 
      team.id === selectedTeam.id 
        ? { 
            ...team, 
            agents: [...team.agents, newAgent] 
          } 
        : team
    ));

    // Update the selected team reference
    setSelectedTeam(prevSelected => ({
      ...prevSelected,
      agents: [...prevSelected.agents, newAgent]
    }));
  };

  // Get all agents for other components
  const allAgents = teamsData.flatMap(team => team.agents);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Removed the TopNavBar */}

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
        />

        {/* Main content - with bg-[#f5f5f5] */}
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          <TeamDashboard 
            team={selectedTeam}
            teamsList={teamsData}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
