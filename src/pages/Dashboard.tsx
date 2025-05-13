
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import TopNavBar from "@/components/layout/TopNavBar";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    if (tab === "settings") {
      navigate("/settings/general");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden w-full">
          {/* Sidebar */}
          <AgentSidebar activeTab="agents" onTabChange={handleTabChange} />

          {/* Main content */}
          <div className="flex-1 overflow-auto p-6">
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
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;
