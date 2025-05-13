
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

const TopNavBar = () => {
  const location = useLocation();
  const path = location.pathname;
  
  // Sample agents data to match the sidebar
  const agents = [
    {
      id: "1",
      name: "Wonder AI",
    },
    {
      id: "2",
      name: "Agora AI",
    },
    {
      id: "3",
      name: "PristineBag AI",
    },
    {
      id: "4",
      name: "AI Kundeservice",
    },
    {
      id: "5",
      name: "theballooncompany.com",
    }
  ];
  
  // Sample teams data
  const teams = [
    {
      id: "1",
      name: "Wonderwave",
      active: true,
    },
    {
      id: "2",
      name: "Analytics Team",
      active: false,
    },
    {
      id: "3",
      name: "Support Team",
      active: false,
    }
  ];
  
  const isActive = (route: string) => {
    if (route === '/settings' && path.startsWith('/settings')) {
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
            {/* Agents Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={isActive('/dashboard') ? 'bg-accent/50' : 'hover:bg-accent/30'}
                  >
                    Agents
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-white">
                    <ul className="grid w-[200px] p-2">
                      {agents.map(agent => (
                        <li key={agent.id}>
                          <NavigationMenuLink asChild>
                            <Link 
                              to={`/agent/${agent.id}`}
                              className="block select-none space-y-1 rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
                            >
                              {agent.name}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                      <li className="border-t mt-2 pt-2">
                        <NavigationMenuLink asChild>
                          <Link 
                            to="/dashboard" 
                            className="block select-none space-y-1 rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
                          >
                            View All Agents
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Teams Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="hover:bg-accent/30">
                    Teams
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-white">
                    <ul className="grid w-[200px] p-2">
                      {teams.map(team => (
                        <li key={team.id}>
                          <NavigationMenuLink asChild>
                            <Link 
                              to={`/team/${team.id}`}
                              className={cn(
                                "block select-none space-y-1 rounded-md p-3 hover:bg-accent hover:text-accent-foreground",
                                team.active && "font-semibold"
                              )}
                            >
                              {team.name} {team.active && "✓"}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                      <li className="border-t mt-2 pt-2">
                        <NavigationMenuLink asChild>
                          <Link 
                            to="/teams/create" 
                            className="block select-none space-y-1 rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
                          >
                            Create Team
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            
            {/* Usage Link */}
            <Link 
              to="/usage" 
              className={`text-sm font-medium px-3 py-2 rounded-md ${isActive('/usage') ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
            >
              Usage
            </Link>
            
            {/* Settings Link */}
            <Link 
              to="/settings" 
              className={`text-sm font-medium px-3 py-2 rounded-md ${isActive('/settings') ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
            >
              Settings
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
          <Link to="/help" className="text-gray-600 hover:text-gray-900">Help</Link>
          <Link to="/changelog" className="text-gray-600 hover:text-gray-900">Changelog</Link>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem>
                <Link to="/profile" className="w-full">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/settings" className="w-full">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/signout" className="w-full">Sign out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
