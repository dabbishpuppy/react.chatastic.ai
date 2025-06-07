
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RetrainingPanelProps {
  agentId: string;
}

export const RetrainingPanel: React.FC<RetrainingPanelProps> = ({ agentId }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Retraining Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Last training</span>
              <Badge variant="outline">2 days ago</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Sources processed</span>
              <span className="font-medium">12/15</span>
            </div>
            <Button className="w-full">Start Retraining</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
