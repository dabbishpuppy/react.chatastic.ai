
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RetrainingPanel } from './RetrainingPanel';
import { MaintenancePanel } from './MaintenancePanel';
import WorkflowStatusDashboard from '@/components/workflow/WorkflowStatusDashboard';
import { useWorkflowRealtime } from '@/hooks/useWorkflowRealtime';
import { ExternalLink, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RAGManagementDashboardProps {
  agentId: string;
}

const RAGManagementDashboard: React.FC<RAGManagementDashboardProps> = ({ agentId }) => {
  const navigate = useNavigate();
  useWorkflowRealtime();

  const handleViewMonitoring = () => {
    navigate('/monitoring');
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
              <p className="text-gray-600 mt-2">
                Manage agent-specific operations, retraining, and maintenance tasks.
              </p>
            </div>
            <Button onClick={handleViewMonitoring} variant="outline">
              <Monitor className="h-4 w-4 mr-2" />
              View Centralized Monitoring
            </Button>
          </div>
        </div>

        {/* Quick Navigation to Centralized Monitoring */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Centralized Monitoring Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">
                  For comprehensive system monitoring, health checks, and testing, 
                  visit the centralized monitoring dashboard.
                </p>
              </div>
              <Button onClick={handleViewMonitoring}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Monitoring Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="workflow" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="retraining">Retraining</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-6">
            <WorkflowStatusDashboard />
          </TabsContent>

          <TabsContent value="retraining" className="space-y-6">
            <RetrainingPanel agentId={agentId} />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <MaintenancePanel agentId={agentId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RAGManagementDashboard;
