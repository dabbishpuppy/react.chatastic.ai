
import React, { useState } from "react";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import UsageStats from "@/components/UsageStats";

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold">
              <span className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded">C</div>
                Wonderwave
              </span>
            </Link>
            <div className="hidden md:block ml-8">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      className={`${navigationMenuTriggerStyle()} ${activeTab === "agents" ? "bg-accent/50" : ""}`}
                      onClick={() => setActiveTab("agents")}
                    >
                      Agents
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      className={`${navigationMenuTriggerStyle()} ${activeTab === "usage" ? "bg-accent/50" : ""}`}
                      onClick={() => setActiveTab("usage")}
                    >
                      Usage
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      className={`${navigationMenuTriggerStyle()} ${activeTab === "settings" ? "bg-accent/50" : ""}`}
                      onClick={() => setActiveTab("settings")}
                    >
                      Settings
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="#docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
            <Link to="#help" className="text-gray-600 hover:text-gray-900">Help</Link>
            <Link to="#changelog" className="text-gray-600 hover:text-gray-900">Changelog</Link>
            <Avatar>
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Sidebar + Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 p-4 hidden md:block">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search team..."
                className="w-full border border-gray-200 py-2 pl-8 pr-4 rounded-md focus:outline-none"
              />
            </div>
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
          
          {activeTab === "settings" && (
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold mb-8">Settings</h1>
              <p>Settings content will go here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
