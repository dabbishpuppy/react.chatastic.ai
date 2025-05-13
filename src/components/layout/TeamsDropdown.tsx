
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
import { cn } from "@/lib/utils";

const TeamsDropdown: React.FC = () => {
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

  return (
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
  );
};

export default TeamsDropdown;
