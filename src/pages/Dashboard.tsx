import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, DollarSign, User, LogOut, ChevronDown, ChevronUp, Users } from "lucide-react";
import UsageStats from "@/components/UsageStats";
import TopNavBar from "@/components/layout/TopNavBar";

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

  const handleUpgradeClick = () => {
    navigate("/settings/plans");
  };

  const handleMyAccountClick = () => {
    navigate("/settings/general");
  };

  const handleLogoutClick = () => {
    navigate("/signout");
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
        {/* Sidebar - Improved with dropdowns */}
        <div className="w-64 border-r border-gray-200 hidden md:flex md:flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="search"
                  placeholder="Search team..."
                  className="w-full border border-gray-200 py-2 pl-8 pr-4 rounded-md focus:outline-none"
                />
              </div>
              
              {/* Teams dropdown section */}
              <div className="mb-4">
                <button 
                  onClick={() => toggleSection('teams')}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-500 mb-2"
                >
                  <span>Teams</span>
                  <span className="transition-transform duration-200">
                    {expandedSections.teams ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedSections.teams ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}>
                  {teamsData.map(team => (
                    <div 
                      key={team.id}
                      className={`px-3 py-2 rounded-md flex items-center justify-between cursor-pointer transition-colors duration-200 ${
                        selectedTeam.id === team.id 
                          ? "bg-gray-100 font-medium" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleTeamSelect(team)}
                    >
                      <div className="flex items-center">
                        <Users size={16} className="mr-2 text-gray-500" />
                        <span>{team.name}</span>
                      </div>
                      {team.isActive && <span>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agents section for the selected team */}
              <div className="mb-4">
                <button 
                  onClick={() => toggleSection('agents')}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-500 mb-2"
                >
                  <span>Agents</span>
                  <span className="transition-transform duration-200">
                    {expandedSections.agents ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedSections.agents ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}>
                  {selectedTeam.agents.map(agent => (
                    <Link 
                      to={`/agent/${agent.id}`}
                      key={agent.id}
                      className="px-3 py-2 rounded-md flex items-center text-sm hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div 
                        className={`w-4 h-4 ${agent.color} rounded-sm mr-2 flex-shrink-0`}
                      ></div>
                      <span className="truncate">{agent.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
                <Plus className="h-4 w-4" />
                <span>Create team</span>
              </Button>
            </div>
          </div>
          
          {/* Bottom section with usage credits */}
          <div className="border-t p-4 space-y-4">
            {/* Usage Credits */}
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-sm font-medium text-gray-800">Usage Credits</div>
              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-gray-500">Free Plan</div>
                <div className="text-xs font-medium text-purple-600">5 left</div>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">0 of 5 used</div>
            </div>
            
            {/* Upgrade button */}
            <Button 
              onClick={handleUpgradeClick}
              className="w-full flex items-center justify-center"
              size="sm"
            >
              <DollarSign size={16} className="mr-1" />
              Upgrade
            </Button>
            
            {/* My Account and Logout */}
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-start text-gray-700"
                size="sm"
                onClick={handleMyAccountClick}
              >
                <User size={16} className="mr-2" />
                My Account
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-start text-gray-700"
                size="sm"
                onClick={handleLogoutClick}
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "agents" && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{selectedTeam.name}'s Agents</h1>
                <Button>New agent</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {selectedTeam.agents.map(agent => (
                  <Link to={`/agent/${agent.id}`} key={agent.id}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`h-40 ${agent.color} flex items-center justify-center`}>
                        <img 
                          src={agent.image} 
                          alt={agent.name} 
                          className="w-16 h-16 object-contain" 
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-center truncate">{agent.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeTab === "usage" && <UsageStats />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
