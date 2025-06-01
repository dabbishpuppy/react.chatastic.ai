
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";

interface QueueStatusDashboardProps {
  healthStatus: any;
  queueMetrics: any;
}

const QueueStatusDashboard: React.FC<QueueStatusDashboardProps> = ({
  healthStatus,
  queueMetrics
}) => {
  if (!healthStatus || !queueMetrics) return null;

  const getHealthIcon = () => {
    if (healthStatus.healthy) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getHealthColor = () => {
    if (healthStatus.healthy) return "bg-green-50 text-green-700 border-green-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4" />
          Production Queue Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {getHealthIcon()}
            <div>
              <div className="text-sm font-medium">System Health</div>
              <Badge variant="outline" className={getHealthColor()}>
                {healthStatus.healthy ? 'Healthy' : 'Degraded'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium">Queue Depth</div>
              <div className="text-lg font-semibold">{healthStatus.queueDepth}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">Active Workers</div>
              <div className="text-lg font-semibold">{healthStatus.activeWorkers}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium">Success Rate</div>
              <div className="text-lg font-semibold">
                {((1 - healthStatus.errorRate) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        {queueMetrics && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Pending:</span>
                <span className="ml-1 font-medium">{queueMetrics.totalPending}</span>
              </div>
              <div>
                <span className="text-gray-500">Processing:</span>
                <span className="ml-1 font-medium">{queueMetrics.totalInProgress}</span>
              </div>
              <div>
                <span className="text-gray-500">Completed:</span>
                <span className="ml-1 font-medium text-green-600">{queueMetrics.totalCompleted}</span>
              </div>
              <div>
                <span className="text-gray-500">Failed:</span>
                <span className="ml-1 font-medium text-red-600">{queueMetrics.totalFailed}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QueueStatusDashboard;
