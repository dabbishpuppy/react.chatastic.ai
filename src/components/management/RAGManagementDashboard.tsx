
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  Settings, 
  RefreshCw,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';
import { useRAGManagement } from '@/hooks/useRAGManagement';

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

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          {agentHealth && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-center space-x-2 ${getHealthColor(agentHealth.overall)}`}>
                    {getHealthIcon(agentHealth.overall)}
                    <span className="text-lg font-semibold capitalize">{agentHealth.overall}</span>
                  </div>
                </CardContent>
              </Card>

              {Object.entries(agentHealth.components).map(([component, status]) => (
                <Card key={component}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium capitalize">{component}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`flex items-center space-x-2 ${getHealthColor(status)}`}>
                      {getHealthIcon(status)}
                      <span className="text-sm font-medium capitalize">{status}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

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
          {/* Retraining Status */}
          {retrainingNeeded && (
            <Card>
              <CardHeader>
                <CardTitle>Retraining Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Retraining Needed:</span>
                    <Badge variant={retrainingNeeded.shouldRetrain ? "destructive" : "secondary"}>
                      {retrainingNeeded.shouldRetrain ? "Yes" : "No"}
                    </Badge>
                  </div>
                  
                  {retrainingNeeded.shouldRetrain && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Urgency:</span>
                        <Badge variant={retrainingNeeded.urgency === 'high' ? "destructive" : 
                                      retrainingNeeded.urgency === 'medium' ? "default" : "secondary"}>
                          {retrainingNeeded.urgency}
                        </Badge>
                      </div>
                      
                      <div>
                        <span className="font-medium">Reasons:</span>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {retrainingNeeded.reasons.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-600">{reason}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <Button 
                        onClick={() => startRetraining({ force: false })}
                        disabled={isStartingRetraining}
                        className="w-full"
                      >
                        {isStartingRetraining ? 'Starting...' : 'Start Retraining'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Retraining Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeJobs.map((job) => (
                    <div key={job.jobId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Job {job.jobId.slice(-8)}</span>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{job.status}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelRetraining(job.jobId)}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Sources: {job.progress.sourcesProcessed}/{job.progress.totalSources}</span>
                            <span>{Math.round((job.progress.sourcesProcessed / job.progress.totalSources) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(job.progress.sourcesProcessed / job.progress.totalSources) * 100} 
                            className="h-2"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Chunks: {job.progress.chunksProcessed}/{job.progress.totalChunks}</span>
                            <span>{Math.round((job.progress.chunksProcessed / job.progress.totalChunks) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(job.progress.chunksProcessed / job.progress.totalChunks) * 100} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Embeddings:</span>
                            <span className="ml-2 font-medium">{job.progress.embeddingsGenerated}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">ETA:</span>
                            <span className="ml-2 font-medium">
                              {job.progress.estimatedTimeRemaining 
                                ? `${Math.round(job.progress.estimatedTimeRemaining / 60000)}m`
                                : 'Calculating...'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Maintenance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {maintenanceTasks.length === 0 ? (
                <p className="text-gray-600">No pending maintenance tasks</p>
              ) : (
                <div className="space-y-4">
                  {maintenanceTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium">{task.type.replace('_', ' ')}</span>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <div className="text-xs text-gray-500">
                            Estimated duration: {task.estimatedDuration} minutes
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => executeMaintenanceTask(task.id)}
                          disabled={isExecutingTask}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Execute
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Automatic Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Automatically schedule maintenance tasks based on agent health status
              </p>
              <Button onClick={autoScheduleMaintenance} className="w-full">
                Schedule Automatic Maintenance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RAGManagementDashboard;
