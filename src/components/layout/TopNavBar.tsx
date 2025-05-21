
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import AgentsDropdown from "./AgentsDropdown";
import TeamsDropdown from "./TeamsDropdown";
import UserDropdown from "./UserDropdown";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const isActive = (route: string) => {
    if (route === '/settings' && path.startsWith('/settings')) {
      return true;
    }
    if (route === '/dashboard' && path.startsWith('/agent')) {
      return true;
    }
    return path === route;
  };

  const navigationItems = (
    <>
      <TeamsDropdown teams={teams} />
      <AgentsDropdown isActive={isActive('/dashboard')} agents={agents} />
    </>
  );

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
          
          {/* Desktop navigation */}
          <div className="hidden md:flex ml-8 space-x-6">
            {navigationItems}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden"
            >
              <Menu size={24} />
              <span className="sr-only">Open menu</span>
            </Button>
          )}
          <UserDropdown />
        </div>
      </div>

      {/* Mobile navigation menu */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="right" className="w-[280px] pt-12">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4"
            >
              <X size={24} />
              <span className="sr-only">Close</span>
            </Button>
            <div className="flex flex-col space-y-6 p-4">
              {navigationItems}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
};

export default TopNavBar;
