
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoRecoverySystemProps {
  parentSourceId: string;
}

interface RecoveryConfig {
  enabled: boolean;
  checkInterval: number; // minutes
  stuckJobThreshold: number; // minutes
  maxRetries: number;
  autoResetStuckJobs: boolean;
  autoTriggerProcessor: boolean;
}

interface RecoveryStats {
  totalRecoveries: number;
  lastRecovery: string | null;
  successRate: number;
  nextCheck: string | null;
}

const AutoRecoverySystem: React.FC<AutoRecoverySystemProps> = ({ parentSourceId }) => {
  const [config, setConfig] = useState<RecoveryConfig>({
    enabled: false,
    checkInterval: 5,
    stuckJobThreshold: 10,
    maxRetries: 3,
    autoResetStuckJobs: true,
    autoTriggerProcessor: true
  });
  const [stats, setStats] = useState<RecoveryStats>({
    totalRecoveries: 0,
    lastRecovery: null,
    successRate: 0,
    nextCheck: null
  });
  const [isActive, setIsActive] = useState(false);
  const { toast } = useToast();

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(`recovery-config-${parentSourceId}`);
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Failed to load recovery config:', error);
      }
    }
  }, [parentSourceId]);

  // Save config to localStorage
  const saveConfig = (newConfig: RecoveryConfig) => {
    setConfig(newConfig);
    localStorage.setItem(`recovery-config-${parentSourceId}`, JSON.stringify(newConfig));
  };

  const checkAndRecover = async () => {
    try {
      console.log('🔍 Auto-recovery: Checking for stuck jobs...');

      // Check for stuck jobs
      const { data: stuckJobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('source_id', parentSourceId)
        .eq('status', 'processing')
        .lt('started_at', new Date(Date.now() - config.stuckJobThreshold * 60 * 1000).toISOString());

      if (error) {
        console.error('Error checking for stuck jobs:', error);
        return;
      }

      const hasStuckJobs = stuckJobs && stuckJobs.length > 0;
      
      // Check for pending jobs that haven't been picked up
      const { data: pendingJobs } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('source_id', parentSourceId)
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - config.checkInterval * 60 * 1000).toISOString());

      const hasStalePendingJobs = pendingJobs && pendingJobs.length > 0;

      if (hasStuckJobs || hasStalePendingJobs) {
        console.log(`🚨 Auto-recovery: Found ${stuckJobs?.length || 0} stuck jobs and ${pendingJobs?.length || 0} stale pending jobs`);
        
        let recoveryActions = [];

        // Reset stuck jobs if enabled
        if (config.autoResetStuckJobs && hasStuckJobs) {
          const { error: resetError } = await supabase
            .from('background_jobs')
            .update({
              status: 'pending',
              started_at: null,
              error_message: 'Auto-reset by recovery system',
              updated_at: new Date().toISOString()
            })
            .in('id', stuckJobs!.map(j => j.id));

          if (!resetError) {
            recoveryActions.push(`Reset ${stuckJobs!.length} stuck jobs`);
          }
        }

        // Trigger job processor if enabled
        if (config.autoTriggerProcessor && (hasStuckJobs || hasStalePendingJobs)) {
          const { error: triggerError } = await supabase.functions.invoke('workflow-job-processor', {
            body: { 
              action: 'process_jobs',
              sourceId: parentSourceId,
              maxJobs: 50,
              autoRecovery: true
            }
          });

          if (!triggerError) {
            recoveryActions.push('Triggered job processor');
          }
        }

        if (recoveryActions.length > 0) {
          setStats(prev => ({
            ...prev,
            totalRecoveries: prev.totalRecoveries + 1,
            lastRecovery: new Date().toISOString()
          }));

          toast({
            title: "Auto-Recovery Executed",
            description: recoveryActions.join(', '),
            variant: "default"
          });
        }
      } else {
        console.log('✅ Auto-recovery: No issues detected');
      }

      // Update next check time
      setStats(prev => ({
        ...prev,
        nextCheck: new Date(Date.now() + config.checkInterval * 60 * 1000).toISOString()
      }));

    } catch (error) {
      console.error('Auto-recovery error:', error);
    }
  };

  // Set up auto-recovery interval
  useEffect(() => {
    let interval: number | null = null;

    if (config.enabled && isActive) {
      console.log(`🛡️ Auto-recovery enabled: checking every ${config.checkInterval} minutes`);
      
      // Initial check
      checkAndRecover();
      
      // Set up interval
      interval = window.setInterval(checkAndRecover, config.checkInterval * 60 * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [config.enabled, config.checkInterval, isActive, parentSourceId]);

  const toggleSystem = () => {
    setIsActive(!isActive);
    if (!isActive) {
      toast({
        title: "Auto-Recovery Started",
        description: `System will check for issues every ${config.checkInterval} minutes`,
        variant: "default"
      });
    } else {
      toast({
        title: "Auto-Recovery Stopped",
        description: "Automatic recovery monitoring disabled",
        variant: "default"
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Auto-Recovery System
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Enable Auto-Recovery</div>
            <div className="text-sm text-gray-500">
              Automatically monitor and fix crawling issues
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={toggleSystem}
          />
        </div>

        {/* Recovery Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{stats.totalRecoveries}</div>
            <div className="text-sm text-gray-500">Total Recoveries</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{stats.successRate.toFixed(0)}%</div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {config.checkInterval}m
            </div>
            <div className="text-sm text-gray-500">Check Interval</div>
          </div>
        </div>

        {/* Last Recovery */}
        {stats.lastRecovery && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Last Recovery: {new Date(stats.lastRecovery).toLocaleString()}</span>
          </div>
        )}

        {/* Next Check */}
        {stats.nextCheck && isActive && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Next Check: {new Date(stats.nextCheck).toLocaleString()}</span>
          </div>
        )}

        {/* Configuration */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-reset stuck jobs</span>
              <Switch
                checked={config.autoResetStuckJobs}
                onCheckedChange={(checked) => saveConfig({ ...config, autoResetStuckJobs: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-trigger job processor</span>
              <Switch
                checked={config.autoTriggerProcessor}
                onCheckedChange={(checked) => saveConfig({ ...config, autoTriggerProcessor: checked })}
              />
            </div>
          </div>
        </div>

        {/* Manual Recovery Button */}
        <div className="border-t pt-4">
          <Button
            onClick={checkAndRecover}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Activity className="w-4 h-4 mr-2" />
            Run Manual Check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoRecoverySystem;
