
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import { MaintenanceTask } from '@/services/rag/management/ragAgentLifecycle';

interface MaintenancePanelProps {
  maintenanceTasks: MaintenanceTask[];
  isExecutingTask: boolean;
  onExecuteMaintenanceTask: (taskId: string) => void;
  onAutoScheduleMaintenance: () => void;
}

export const MaintenancePanel: React.FC<MaintenancePanelProps> = ({
  maintenanceTasks,
  isExecutingTask,
  onExecuteMaintenanceTask,
  onAutoScheduleMaintenance
}) => {
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
    <div className="space-y-6">
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
                      onClick={() => onExecuteMaintenanceTask(task.id)}
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
          <Button onClick={onAutoScheduleMaintenance} className="w-full">
            Schedule Automatic Maintenance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
