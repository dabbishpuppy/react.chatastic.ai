
import React from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import AgentsDropdown from "./AgentsDropdown";
import TeamsDropdown from "./TeamsDropdown";
import UserDropdown from "./UserDropdown";

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
    <header className="border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-2xl font-bold">
            <span className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded">C</div>
              Wonderwave
            </span>
          </Link>
          <div className="hidden md:flex ml-8 space-x-6">
            {/* Teams Dropdown - Now first */}
            <TeamsDropdown />
            
            {/* Agents Dropdown - Now second */}
            <AgentsDropdown isActive={isActive('/dashboard')} />
            
            {/* Usage Link */}
            <Link 
              to="/usage" 
              className={`px-3 py-2 rounded-md ${isActive('/usage') ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
            >
              Usage
            </Link>
            
            {/* Settings Link */}
            <Link 
              to="/settings" 
              className={`px-3 py-2 rounded-md ${isActive('/settings') ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
            >
              Settings
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
          <Link to="/help" className="text-gray-600 hover:text-gray-900">Help</Link>
          <Link to="/changelog" className="text-gray-600 hover:text-gray-900">Changelog</Link>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
