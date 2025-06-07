
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HealthOverview } from './HealthOverview';
import { RetrainingPanel } from './RetrainingPanel';
import { MaintenancePanel } from './MaintenancePanel';
import WorkflowStatusDashboard from '@/components/workflow/WorkflowStatusDashboard';
import { useWorkflowRealtime } from '@/hooks/useWorkflowRealtime';

interface RAGManagementDashboardProps {
  agentId: string;
}

const RAGManagementDashboard: React.FC<RAGManagementDashboardProps> = ({ agentId }) => {
  // Set up real-time workflow updates for this agent
  useWorkflowRealtime();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">RAG Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your RAG system's health, performance, and background processes.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="retraining">Retraining</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <HealthOverview agentId={agentId} />
          </TabsContent>

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
