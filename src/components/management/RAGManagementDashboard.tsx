import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Settings, 
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { useRAGManagement } from '@/hooks/useRAGManagement';
import { HealthOverview } from './HealthOverview';
import { RetrainingPanel } from './RetrainingPanel';
import { MaintenancePanel } from './MaintenancePanel';

interface RAGManagementDashboardProps {
  agentId: string;
}

const RAGManagementDashboard: React.FC<RAGManagementDashboardProps> = ({ agentId }) => {
  const {
    // Retraining
    retrainingNeeded,
    activeJobs,
    checkRetrainingNeeded,
    startRetraining,
    cancelRetraining,
    isStartingRetraining,

    // Model management
    modelVersions,
    activeModels,
    loadModelVersions,
    autoSelectBestModel,

    // Lifecycle
    agentHealth,
    currentStage,
    maintenanceTasks,
    performHealthCheck,
    autoScheduleMaintenance,
    executeMaintenanceTask,
    isCheckingHealth,
    isExecutingTask,

    error,
    clearError
  } = useRAGManagement(agentId);

  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    // Initial data loading
    checkRetrainingNeeded();
    performHealthCheck();
    loadModelVersions();
  }, [agentId]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">RAG Management</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={performHealthCheck} 
            disabled={isCheckingHealth}
            variant="outline"
          >
            <Activity className="h-4 w-4 mr-2" />
            {isCheckingHealth ? 'Checking...' : 'Health Check'}
          </Button>
          <Button onClick={autoScheduleMaintenance} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Auto Schedule
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-red-800">{error}</p>
              <Button onClick={clearError} variant="ghost" size="sm">
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retraining">Retraining</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Health Overview */}
          {agentHealth && <HealthOverview agentHealth={agentHealth} />}

          {/* Current Stage */}
          {currentStage && (
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {currentStage.stage}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Since: {new Date(currentStage.enteredAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => startRetraining({ force: false })}
                  disabled={isStartingRetraining}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Retraining
                </Button>
                <Button 
                  onClick={() => autoSelectBestModel('embedding')}
                  variant="outline"
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Optimize Models
                </Button>
                <Button 
                  onClick={checkRetrainingNeeded}
                  variant="outline"
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Check Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retraining Tab */}
        <TabsContent value="retraining" className="space-y-6">
          <RetrainingPanel
            retrainingNeeded={retrainingNeeded}
            activeJobs={activeJobs}
            isStartingRetraining={isStartingRetraining}
            onStartRetraining={() => startRetraining({ force: false })}
            onCancelRetraining={cancelRetraining}
          />
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          {Object.entries(modelVersions).map(([modelType, versions]) => (
            <Card key={modelType}>
              <CardHeader>
                <CardTitle className="capitalize">{modelType} Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Active Model */}
                  {activeModels[modelType] && (
                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{activeModels[modelType].modelName}</span>
                          <Badge variant="secondary" className="ml-2">Active</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          v{activeModels[modelType].version}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-600">Accuracy:</span>
                          <span className="ml-1 font-medium">{(activeModels[modelType].performance.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Latency:</span>
                          <span className="ml-1 font-medium">{activeModels[modelType].performance.latency}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Throughput:</span>
                          <span className="ml-1 font-medium">{activeModels[modelType].performance.throughput}/s</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost:</span>
                          <span className="ml-1 font-medium">${activeModels[modelType].performance.cost}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Available Versions */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Available Versions</h4>
                    {versions.filter(v => v.id !== activeModels[modelType]?.id).map((version) => (
                      <div key={version.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{version.modelName}</span>
                            <Badge variant="outline" className="ml-2">v{version.version}</Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            Activate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Auto-select Best */}
                  <Button 
                    onClick={() => autoSelectBestModel(modelType)}
                    variant="outline"
                    className="w-full"
                  >
                    Auto-Select Best {modelType} Model
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <MaintenancePanel
            maintenanceTasks={maintenanceTasks}
            isExecutingTask={isExecutingTask}
            onExecuteMaintenanceTask={executeMaintenanceTask}
            onAutoScheduleMaintenance={autoScheduleMaintenance}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RAGManagementDashboard;
