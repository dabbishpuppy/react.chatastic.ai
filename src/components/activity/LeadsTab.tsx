
import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const LeadsTab: React.FC = () => {
  const navigate = useNavigate();
  const { agentId } = useParams();

  const handleViewLeads = () => {
    navigate(`/agent/${agentId}/activity/leads`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Leads</h2>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">View All Leads</h3>
          <p className="text-gray-600 mb-4">
            Access the dedicated leads page to view, filter, and export all leads collected by your agent.
          </p>
          <Button onClick={handleViewLeads} className="bg-black hover:bg-gray-800 flex gap-2 items-center mx-auto">
            View Leads Page
            <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadsTab;
