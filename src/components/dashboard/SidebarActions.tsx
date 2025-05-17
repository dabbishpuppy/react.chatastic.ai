
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cog, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const SidebarActions = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
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
      <div className="flex items-center justify-between mb-4">
        <Link to="/settings">
          <Button variant="ghost" className="h-8 w-8 p-0" title="Settings">
            <Cog size={20} />
          </Button>
        </Link>
        <Link to="/help">
          <Button variant="ghost" className="h-8 w-8 p-0" title="Help & Support">
            <HelpCircle size={20} />
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="h-8 w-8 p-0" 
          title="Sign Out"
          onClick={handleSignOut}
        >
          <LogOut size={20} />
        </Button>
      </div>
    </div>
  );
};

export default SidebarActions;
