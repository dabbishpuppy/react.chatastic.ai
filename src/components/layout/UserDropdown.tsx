
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard, User, LogOut, UserRound, Book, HelpCircle, GitPullRequest } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

const UserDropdown: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center">
          <UserRound size={20} className="text-gray-600 hover:text-gray-900" />
        </div>
        <ChevronDown size={16} className="text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 bg-white">
        <div className="px-3 py-2">
          <div className="font-medium">Wonderwave</div>
          <div className="text-sm text-gray-500">{user?.email || 'User'}</div>
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
        
        {/* New section for Docs, Help, Changelog */}
        <DropdownMenuItem>
          <Link to="/docs" className="w-full text-sm flex items-center gap-2">
            <Book size={16} />
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
            <GitPullRequest size={16} />
            Changelog
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut}>
          <div className="w-full text-sm flex items-center gap-2">
            <LogOut size={16} />
            Sign out
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
