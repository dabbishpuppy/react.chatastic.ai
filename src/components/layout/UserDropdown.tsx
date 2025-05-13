
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
import { LineChart, Settings, FileText, HelpCircle, Sparkles, User, LogOut } from "lucide-react";

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
          <Link to="/docs" className="w-full text-sm flex items-center gap-2">
            <FileText size={16} />
            Docs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/help" className="w-full text-sm flex items-center gap-2">
            <HelpCircle size={16} />
            Help
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/changelog" className="w-full text-sm flex items-center gap-2">
            <Sparkles size={16} />
            Changelog
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
