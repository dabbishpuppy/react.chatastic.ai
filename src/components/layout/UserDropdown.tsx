
import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard, User, LogOut } from "lucide-react";

const UserDropdown: React.FC = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1">
        <Avatar>
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback className="bg-gray-200">
            <User size={16} className="text-gray-500" />
          </AvatarFallback>
        </Avatar>
        <ChevronDown size={16} className="text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 bg-white">
        <div className="px-3 py-2">
          <div className="font-medium">Wonderwave</div>
          <div className="text-sm text-gray-500">nohman@wonderwave.no</div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <Link to="/dashboard" className="w-full text-sm flex items-center gap-2">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings/general" className="w-full text-sm flex items-center gap-2">
            <User size={16} />
            My Account
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <Link to="/signout" className="w-full text-sm flex items-center gap-2">
            <LogOut size={16} />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
