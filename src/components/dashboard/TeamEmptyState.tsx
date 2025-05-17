
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus } from 'lucide-react';
import CreateTeamDialog from './CreateTeamDialog';

interface TeamEmptyStateProps {
  onCreateTeam: (team: any) => void;
}

const TeamEmptyState: React.FC<TeamEmptyStateProps> = ({ onCreateTeam }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Users size={28} className="text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Wonderwave</CardTitle>
          <CardDescription>Get started by creating your first team</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Teams help you organize your AI agents and collaborate with others.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Your First Team
          </Button>
        </CardFooter>
      </Card>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTeamCreated={onCreateTeam}
      />
    </div>
  );
};

export default TeamEmptyState;
