
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DollarSign, User, LogOut, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SidebarActions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUpgrade = () => {
    navigate("/settings/plans");
  };

  const handleSettings = () => {
    navigate("/settings/general");
  };

  const handleLogout = () => {
    toast({
      title: "Signed out",
      description: "You have been successfully signed out."
    });
    // Add actual logout logic here when authentication is implemented
  };

  // Mock credits data - replace with actual data when available
  const totalCredits = 1250;

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      {/* Total Credits */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Total Credits</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{totalCredits.toLocaleString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button 
          onClick={handleUpgrade}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          Upgrade
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={handleSettings}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-2"
          >
            <Settings size={16} />
            Settings
          </Button>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SidebarActions;
