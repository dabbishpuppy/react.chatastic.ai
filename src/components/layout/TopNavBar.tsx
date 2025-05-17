
import React from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import AgentsDropdown from "./AgentsDropdown";
import TeamsDropdown from "./TeamsDropdown";
import UserDropdown from "./UserDropdown";

interface TopNavBarProps {
  teams?: Array<{
    id: string;
    name: string;
    isActive?: boolean;
    agents?: Array<any>;
  }>;
  agents?: Array<{
    id: number | string;
    name: string;
    image?: string;
    color?: string;
    status?: string;
  }>;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ teams = [], agents = [] }) => {
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
            {/* Teams Dropdown - with props */}
            <TeamsDropdown teams={teams} />
            
            {/* Agents Dropdown - with props */}
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
