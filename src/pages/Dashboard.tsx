
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNavBar from "@/components/layout/TopNavBar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TeamDashboard from "@/components/dashboard/TeamDashboard";

// Sample data structure for teams and their agents
const teamsData = [
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

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar 
          teams={teamsData}
          selectedTeam={selectedTeam}
          expandedSections={expandedSections}
          onTeamSelect={handleTeamSelect}
          toggleSection={toggleSection}
        />

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
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
