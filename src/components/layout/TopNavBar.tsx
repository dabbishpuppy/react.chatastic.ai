
import React from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import AgentsDropdown from "./AgentsDropdown";
import TeamsDropdown from "./TeamsDropdown";
import UserDropdown from "./UserDropdown";

// Import the teams data to pass to the dropdowns
const teams = [
  {
    id: "1",
    name: "Wonderwave",
    isActive: true,
  },
  {
    id: "2",
    name: "Analytics Team",
    isActive: false,
  },
  {
    id: "3",
    name: "Support Team",
    isActive: false,
  }
];

// Combine all agents for the dropdown
const agents = [
  {
    id: 1,
    name: "Wonder AI",
    image: "/placeholder.svg",
    color: "bg-violet-600",
    status: "active",
  },
  {
    id: 2,
    name: "Agora AI",
    image: "/placeholder.svg", 
    color: "bg-amber-100",
    status: "active",
  },
  {
    id: 3,
    name: "PristineBag AI",
    image: "/placeholder.svg",
    color: "bg-rose-400",
    status: "inactive",
  },
  {
    id: 4,
    name: "AI Kundeservice",
    image: "/placeholder.svg",
    color: "bg-black",
    status: "active",
  },
  {
    id: 5,
    name: "theballooncompany.com",
    image: "/placeholder.svg",
    color: "bg-white",
    status: "active",
  }
];

const TopNavBar = () => {
  const location = useLocation();
  const path = location.pathname;
  
  const isActive = (route: string) => {
    if (route === '/settings' && path.startsWith('/settings')) {
      return true;
    }
    if (route === '/dashboard' && path.startsWith('/agent')) {
      return true;
    }
    return path === route;
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/dashboard" className="text-2xl font-bold">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded">C</div>
              Wonderwave
            </span>
          </Link>
          <div className="hidden md:flex ml-8 space-x-6">
            {/* Teams Dropdown - now with props */}
            <TeamsDropdown teams={teams} />
            
            {/* Agents Dropdown - now with props */}
            <AgentsDropdown isActive={isActive('/dashboard')} agents={agents} />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
