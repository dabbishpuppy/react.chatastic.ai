
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cog, HelpCircle, LogOut, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SidebarActions = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  
  // Get initials for avatar
  const getInitials = () => {
    if (!user?.email) return "?";
    return user.email.substring(0, 2).toUpperCase();
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out from your account."
      });
      navigate('/signin');
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      {/* User info */}
      <div className="mb-4 flex items-center space-x-3">
        <Avatar className="h-8 w-8 bg-black text-white">
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <div className="text-sm truncate">
          {user?.email || "User"}
        </div>
      </div>
      
      {/* Credits section */}
      <div className="mb-4 p-2 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Credits</span>
          <span className="text-xs font-medium">1,234</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs h-7 mt-1 flex items-center gap-1"
          onClick={() => navigate("/billing")}
        >
          <DollarSign size={14} />
          Buy Credits
        </Button>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings">
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Cog size={20} />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/profile">
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <User size={20} />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Profile</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/help">
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <HelpCircle size={20} />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Help & Support</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-8 w-8 p-0" 
                onClick={handleSignOut}
              >
                <LogOut size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default SidebarActions;
