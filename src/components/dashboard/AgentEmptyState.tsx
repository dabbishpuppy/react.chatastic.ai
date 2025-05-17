
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Plus } from 'lucide-react';
import CreateAgentDialog from './CreateAgentDialog';

interface AgentEmptyStateProps {
  teamName?: string;
  onCreateAgent: (agent: any) => void;
}

const AgentEmptyState: React.FC<AgentEmptyStateProps> = ({ teamName, onCreateAgent }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Get the current team for the dialog
  const mockTeam = {
    id: '',
    name: teamName || '',
    isActive: true,
    agents: []
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Bot size={28} className="text-primary" />
          </div>
          <CardTitle className="text-2xl">No Agents Yet</CardTitle>
          <CardDescription>
            {teamName 
              ? `Your ${teamName} team doesn't have any AI agents yet.` 
              : "Your team doesn't have any AI agents yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Create your first AI agent to start providing intelligent assistance to your users.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Your First Agent
          </Button>
        </CardFooter>
      </Card>

      <CreateAgentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teams={mockTeam ? [mockTeam] : []} 
        onAgentCreated={onCreateAgent}
      />
    </div>
  );
};

export default AgentEmptyState;
