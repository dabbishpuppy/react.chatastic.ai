
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Users, Settings } from "lucide-react";
import CreateAgentDialog from "./CreateAgentDialog";
import CreateTeamDialog from "./CreateTeamDialog";
import { useToast } from "@/hooks/use-toast";

interface SidebarActionsProps {
  onAgentCreated?: () => void;
  onTeamCreated?: () => void;
}

const SidebarActions: React.FC<SidebarActionsProps> = ({
  onAgentCreated,
  onTeamCreated
}) => {
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const { toast } = useToast();

  const handleAgentCreated = () => {
    setShowCreateAgent(false);
    onAgentCreated?.();
    toast({
      title: "Agent Created",
      description: "Your new agent has been created successfully."
    });
  };

  const handleTeamCreated = () => {
    setShowCreateTeam(false);
    onTeamCreated?.();
    toast({
      title: "Team Created",
      description: "Your new team has been created successfully."
    });
  };

  // Provide default teams data since we don't have access to teams in this component
  const defaultTeams = [
    {
      id: "default-team",
      name: "Default Team",
      isActive: true,
      agents: []
    }
  ];

  return (
    <div className="space-y-2">
      <Button
        onClick={() => setShowCreateAgent(true)}
        className="w-full justify-start"
        variant="ghost"
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        Create Agent
      </Button>
      
      <Button
        onClick={() => setShowCreateTeam(true)}
        className="w-full justify-start"
        variant="ghost"
      >
        <Users className="mr-2 h-4 w-4" />
        Create Team
      </Button>

      <CreateAgentDialog
        open={showCreateAgent}
        onOpenChange={setShowCreateAgent}
        teams={defaultTeams}
        onAgentCreated={handleAgentCreated}
      />

      <CreateTeamDialog
        open={showCreateTeam}
        onOpenChange={setShowCreateTeam}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  );
};

export default SidebarActions;
