
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductionInfrastructure } from '@/hooks/useProductionInfrastructure';
import { QueueMonitor } from './QueueMonitor';
import { SystemOverview } from './SystemOverview';
import { ServiceControlPanel } from './ServiceControlPanel';
import DatabaseHealthMonitor from '@/components/sources/DatabaseHealthMonitor';

export const ProductionCrawlDashboard: React.FC = () => {
  const { 
    systemHealth, 
    loading,
    loadSystemHealth
  } = useProductionInfrastructure();

  const isLoading = loading;
  const error = null; // Infrastructure hook doesn't expose error currently
  const refreshData = loadSystemHealth;

  // Mock queue data for now
  const queueData = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading production dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading dashboard: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Production Crawl Dashboard</h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Queue Monitor</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="database">Database Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SystemOverview 
            metrics={systemHealth}
            overallHealth={systemHealth?.healthPercentage || 0}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <QueueMonitor 
            queueData={queueData}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ServiceControlPanel />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-6">
            <DatabaseHealthMonitor />
            <Card>
              <CardHeader>
                <CardTitle>Database Maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  This section monitors database health and provides tools to fix common issues 
                  that can cause status aggregator errors.
                </p>
                <div className="text-xs text-gray-500">
                  • Orphaned pages are source pages that reference non-existent parent sources
                  • These can cause 404 errors in the status aggregator
                  • Regular cleanup prevents these issues from accumulating
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionCrawlDashboard;
