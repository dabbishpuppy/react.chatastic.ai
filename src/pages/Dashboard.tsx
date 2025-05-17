
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNavBar from "@/components/layout/TopNavBar";
import UsageStats from "@/components/UsageStats";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import AgentCards from "@/components/dashboard/AgentCards";

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
      },
      {
        id: 2,
        name: "Agora AI",
        image: "/placeholder.svg", 
        color: "bg-amber-100",
      },
    ]
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
      },
      {
        id: 4,
        name: "AI Kundeservice",
        image: "/placeholder.svg",
        color: "bg-black",
      },
    ]
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
      }
    ]
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
          {activeTab === "agents" && (
            <AgentCards
              teamName={selectedTeam.name}
              agents={selectedTeam.agents}
            />
          )}

          {activeTab === "usage" && <UsageStats />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
