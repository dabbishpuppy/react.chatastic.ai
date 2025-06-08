
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, RefreshCw, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CrawlSystemManager } from '@/services/rag/enhanced/crawlSystemManager';
import { JobRecoveryService } from '@/services/rag/enhanced/jobRecoveryService';
import { JobAutomationService } from '@/services/rag/enhanced/jobAutomationService';
import { supabase } from '@/integrations/supabase/client';

export const EnhancedJobManager: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const handleRecovery = async () => {
    setIsProcessing(true);
    try {
      console.log('🔧 Manual recovery triggered...');
      const metrics = await JobRecoveryService.recoverStalledJobs();
      
      toast({
        title: "Recovery Complete",
        description: `Recovered ${metrics.recoveredJobs} stalled jobs, fixed ${metrics.orphanedJobs} orphaned pages`
      });
      
      await updateSystemStatus();
    } catch (error) {
      console.error('Recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSystemRecovery = async () => {
    setIsProcessing(true);
    try {
      console.log('🚀 System recovery triggered...');
      const result = await CrawlSystemManager.triggerRecovery();
      
      toast({
        title: "System Recovery Complete",
        description: result.message
      });
      
      await updateSystemStatus();
    } catch (error) {
      console.error('System recovery failed:', error);
      toast({
        title: "System Recovery Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutomationForce = async () => {
    setIsProcessing(true);
    try {
      console.log('🤖 Force automation cycle...');
      await JobAutomationService.forceRun();
      
      toast({
        title: "Automation Cycle Complete",
        description: "Forced automation cycle completed successfully"
      });
      
      await updateSystemStatus();
    } catch (error) {
      console.error('Force automation failed:', error);
      toast({
        title: "Automation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSystemStatus = async () => {
    try {
      const status = await CrawlSystemManager.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to get system status:', error);
    }
  };

  React.useEffect(() => {
    updateSystemStatus();
    
    // Update status every 30 seconds
    const interval = setInterval(updateSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (healthy: boolean) => {
    return healthy ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Enhanced Job Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {systemStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant={systemStatus.isHealthy ? "default" : "destructive"}>
                {systemStatus.isHealthy ? "Healthy" : "Unhealthy"}
              </Badge>
              <p className="text-sm text-gray-600">System Status</p>
            </div>
            <div className="text-center">
              <Badge className={getStatusColor(systemStatus.components.jobSync)}>
                {systemStatus.components.jobSync ? "Running" : "Stopped"}
              </Badge>
              <p className="text-sm text-gray-600">Job Sync</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold">{systemStatus.metrics.activeSources}</span>
              <p className="text-sm text-gray-600">Active Sources</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold">{systemStatus.metrics.pendingJobs}</span>
              <p className="text-sm text-gray-600">Pending Jobs</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Manual Controls</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRecovery}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recover Stalled Jobs
            </Button>
            
            <Button
              onClick={handleSystemRecovery}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              System Recovery
            </Button>
            
            <Button
              onClick={handleAutomationForce}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Force Automation
            </Button>
          </div>
        </div>

        {systemStatus?.recommendations && (
          <div className="space-y-2">
            <h4 className="font-medium">System Recommendations</h4>
            <ul className="text-sm space-y-1">
              {systemStatus.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
