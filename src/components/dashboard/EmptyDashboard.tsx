
import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyDashboardProps {
  onCreateTeamClick: () => void;
}

const EmptyDashboard: React.FC<EmptyDashboardProps> = ({ onCreateTeamClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        You haven't created any teams yet. Create your first team to get started.
      </p>
      <Button 
        onClick={onCreateTeamClick}
        size="lg"
      >
        Create Your First Team
      </Button>
    </div>
  );
};

export default EmptyDashboard;
