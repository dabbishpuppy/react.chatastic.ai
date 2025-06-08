
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { DatabaseCleanupService } from '@/services/rag/enhanced/databaseCleanupService';
import { toast } from 'sonner';

interface DatabaseHealth {
  orphanedPages: number;
  invalidSources: number;
  totalPages: number;
  totalSources: number;
}

const DatabaseHealthMonitor: React.FC = () => {
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const healthData = await DatabaseCleanupService.getDatabaseHealth();
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load database health:', error);
      toast.error('Failed to load database health');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedPages = async () => {
    setCleaning(true);
    try {
      const result = await DatabaseCleanupService.cleanupOrphanedSourcePages();
      
      if (result.errors.length > 0) {
        toast.error(`Cleanup completed with errors: ${result.errors.join(', ')}`);
      } else {
        toast.success(`Successfully cleaned up ${result.cleaned} orphaned pages`);
      }
      
      // Reload health after cleanup
      await loadHealth();
    } catch (error) {
      console.error('Failed to cleanup orphaned pages:', error);
      toast.error('Failed to cleanup orphaned pages');
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const getHealthStatus = () => {
    if (!health) return 'unknown';
    
    if (health.orphanedPages > 0) return 'warning';
    return 'healthy';
  };

  const getStatusColor = () => {
    const status = getHealthStatus();
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    const status = getHealthStatus();
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Database Health</span>
          </div>
          <Badge className={getStatusColor()}>
            {getHealthStatus()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading health data...</span>
          </div>
        ) : health ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Sources:</span>
                <span className="ml-2 font-medium">{health.totalSources}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Pages:</span>
                <span className="ml-2 font-medium">{health.totalPages}</span>
              </div>
              <div>
                <span className="text-gray-600">Orphaned Pages:</span>
                <span className={`ml-2 font-medium ${health.orphanedPages > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {health.orphanedPages}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Invalid Sources:</span>
                <span className={`ml-2 font-medium ${health.invalidSources > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {health.invalidSources}
                </span>
              </div>
            </div>

            {health.orphanedPages > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Database Issues Detected
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Found {health.orphanedPages} orphaned pages that reference non-existent parent sources.
                  This can cause status aggregator errors.
                </p>
                <Button
                  onClick={cleanupOrphanedPages}
                  disabled={cleaning}
                  size="sm"
                  variant="outline"
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clean Up
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-600">Failed to load health data</div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={loadHealth}
            disabled={loading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseHealthMonitor;
