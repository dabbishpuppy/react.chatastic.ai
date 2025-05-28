
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
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

  // Mock data - replace with actual data when available
  const usageData = {
    plan: "Free Plan",
    creditsUsed: 0,
    creditsTotal: 5,
    creditsLeft: 5
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      {/* Upgrade Button */}
      <Button 
        onClick={handleUpgrade}
        className="w-full bg-black hover:bg-gray-800 text-white mb-4 flex items-center justify-center gap-2"
        size="sm"
      >
        <span className="text-white">⭐</span>
        Upgrade
      </Button>

      {/* Usage Credits Section */}
      <div className="mb-4">
        <div className="text-lg font-semibold text-gray-900 mb-1">Usage Credits</div>
        <div className="text-sm text-gray-600 mb-2">{usageData.plan}</div>
        <div className="text-sm text-gray-600 mb-1">Premium feature usage</div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">{usageData.creditsUsed} of {usageData.creditsTotal} used</span>
          <span className="text-sm font-medium text-purple-600">{usageData.creditsLeft} left</span>
        </div>
      </div>

      {/* Action Buttons */}
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
  );
};

export default SidebarActions;
