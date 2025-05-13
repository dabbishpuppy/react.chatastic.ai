
import React from "react";
import { Link } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface AgentsDropdownProps {
  isActive: boolean;
}

const AgentsDropdown: React.FC<AgentsDropdownProps> = ({ isActive }) => {
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

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger 
            className={isActive ? 'bg-accent/50' : 'hover:bg-accent/30'}
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
  );
};

export default AgentsDropdown;
