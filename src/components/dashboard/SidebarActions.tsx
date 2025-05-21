
import React from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const SidebarActions = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  
  const handleUpgradeClick = () => {
    navigate("/settings/plans");
  };

  const handleMyAccountClick = () => {
    navigate("/settings/general");
  };

  const handleLogoutClick = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account",
      });
      navigate("/signin");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was an error signing out",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="border-t p-4 space-y-4">
      {/* Usage Credits */}
      <div className="bg-gray-50 rounded-md p-3">
        <div className="text-sm font-medium text-gray-800">Usage Credits</div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-xs text-gray-500">Free Plan</div>
          <div className="text-xs font-medium text-purple-600">5 left</div>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">0 of 5 used</div>
      </div>
      
      {/* Upgrade button */}
      <Button 
        onClick={handleUpgradeClick}
        className="w-full flex items-center justify-center"
        size="sm"
      >
        <DollarSign size={16} className="mr-1" />
        Upgrade
      </Button>
      
      {/* My Account and Logout */}
      <div className="space-y-2">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start text-gray-700"
          size="sm"
          onClick={handleMyAccountClick}
        >
          <User size={16} className="mr-2" />
          My Account
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start text-gray-700"
          size="sm"
          onClick={handleLogoutClick}
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default SidebarActions;
