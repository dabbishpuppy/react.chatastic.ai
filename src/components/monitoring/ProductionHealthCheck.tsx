
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { ProductionErrorMonitor } from '@/utils/productionErrorMonitoring';

export const ProductionHealthCheck: React.FC = () => {
  const [errorStats, setErrorStats] = useState<Record<string, number>>({});
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const refreshStats = () => {
    const stats = ProductionErrorMonitor.getErrorStats();
    setErrorStats(stats);
    setLastCheck(new Date());
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const total406Errors = Object.entries(errorStats)
    .filter(([key]) => key.startsWith('406_'))
    .reduce((sum, [, count]) => sum + count, 0);

  const healthStatus = total406Errors === 0 ? 'healthy' : total406Errors < 5 ? 'warning' : 'critical';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Production Health Check
          {healthStatus === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {healthStatus === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          {healthStatus === 'critical' && <AlertTriangle className="h-5 w-5 text-red-500" />}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={refreshStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{total406Errors}</div>
            <p className="text-xs text-muted-foreground">406 Errors (Last Minute)</p>
          </div>
          <div className="text-center">
            <Badge variant={healthStatus === 'healthy' ? 'default' : 
                          healthStatus === 'warning' ? 'secondary' : 'destructive'}>
              {healthStatus.toUpperCase()}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">System Status</p>
          </div>
          <div className="text-center">
            <div className="text-sm">{lastCheck.toLocaleTimeString()}</div>
            <p className="text-xs text-muted-foreground">Last Check</p>
          </div>
        </div>

        {Object.keys(errorStats).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Error Breakdown</h4>
            <div className="space-y-1">
              {Object.entries(errorStats).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{key}</span>
                  <Badge variant={count > 5 ? 'destructive' : 'secondary'}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {healthStatus === 'critical' && (
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-red-800">
              🚨 High error rate detected. Consider pausing crawling operations 
              and investigating the root cause.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Production Checklist:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>All .single() calls audited and replaced with .maybeSingle() where appropriate</li>
            <li>Circuit breakers active for high-error contexts</li>
            <li>Monitoring alerts configured for 406 error spikes</li>
            <li>Crawling system resilient to missing records</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
