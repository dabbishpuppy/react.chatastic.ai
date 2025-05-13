
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
import { LineChart, Settings, User, LogOut } from "lucide-react";
import { Users, CreditCard, KeyRound, Package } from "lucide-react";

const UserDropdown: React.FC = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        <DropdownMenuItem>
          <Link to="/profile" className="w-full text-sm flex items-center gap-2">
            <User size={16} />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/usage" className="w-full text-sm flex items-center gap-2">
            <LineChart size={16} />
            Usage
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings" className="w-full text-sm flex items-center gap-2">
            <Settings size={16} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link to="/settings/general" className="w-full text-sm flex items-center gap-2">
            <Settings size={16} />
            General
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings/members" className="w-full text-sm flex items-center gap-2">
            <Users size={16} />
            Members
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
