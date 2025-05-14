
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import UsageStats from "@/components/UsageStats";
import TopNavBar from "@/components/layout/TopNavBar";

const agentCards = [
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
  {
    id: 5,
    name: "theballooncompany.com",
    image: "/placeholder.svg",
    color: "bg-white",
  }
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("agents");
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "settings") {
      navigate("/settings/general");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Removed the p-4 padding to fix white space */}
        <div className="w-64 border-r border-gray-200 hidden md:block">
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search team..."
                className="w-full border border-gray-200 py-2 pl-8 pr-4 rounded-md focus:outline-none"
              />
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Teams</h3>
              <div className="bg-gray-100 px-3 py-2 rounded-md flex items-center justify-between font-medium">
                <span>Wonderwave</span>
                <span>✓</span>
              </div>
            </div>

            <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
              <Plus className="h-4 w-4" />
              <span>Create team</span>
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "agents" && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">AI Agents</h1>
                <Button>New agent</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {agentCards.map(agent => (
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
