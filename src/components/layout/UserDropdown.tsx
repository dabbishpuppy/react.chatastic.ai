
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
import { ChevronDown, LineChart, Settings, User, LogOut } from "lucide-react";
import { Users, CreditCard, KeyRound, Package } from "lucide-react";

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
          <Link to="/settings/general" className="w-full text-sm flex items-center gap-2">
            <Settings size={16} />
            General
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/usage" className="w-full text-sm flex items-center gap-2">
            <LineChart size={16} />
            Usage
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings/plans" className="w-full text-sm flex items-center gap-2">
            <Package size={16} />
            Plans
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings/billing" className="w-full text-sm flex items-center gap-2">
            <CreditCard size={16} />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings/members" className="w-full text-sm flex items-center gap-2">
            <Users size={16} />
            Members
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings" className="w-full text-sm flex items-center gap-2">
            <Settings size={16} />
            Team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings/api-keys" className="w-full text-sm flex items-center gap-2">
            <KeyRound size={16} />
            API Keys
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
