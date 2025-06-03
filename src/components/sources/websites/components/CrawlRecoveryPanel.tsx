
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';
import { toast } from '@/hooks/use-toast';

interface CrawlRecoveryPanelProps {
  agentId: string;
  onRecoveryComplete?: () => void;
}

const CrawlRecoveryPanel: React.FC<CrawlRecoveryPanelProps> = ({ 
  agentId, 
  onRecoveryComplete 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleTriggerProcessing = async () => {
    setIsProcessing(true);
    try {
      const result = await CrawlRecoveryService.triggerManualProcessing();
      
      if (result.success) {
        toast({
          title: "Processing Triggered",
          description: result.message,
        });
        onRecoveryComplete?.();
      } else {
        toast({
          title: "Processing Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger processing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetectAndRecover = async () => {
    setIsDetecting(true);
    try {
      const result = await CrawlRecoveryService.detectAndRecoverStuckCrawls(agentId);
      
      if (result.success) {
        toast({
          title: "Recovery Complete",
          description: result.message,
        });
        onRecoveryComplete?.();
      } else {
        toast({
          title: "Recovery Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to detect and recover stuck crawls",
        variant: "destructive"
      });
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle size={16} />
          Crawl Recovery Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-orange-700">
          Use these tools if you have crawls stuck in "pending" or "crawling" status for more than a few minutes.
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerProcessing}
            disabled={isProcessing}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Trigger Processing
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDetectAndRecover}
            disabled={isDetecting}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isDetecting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Auto-Recover Stuck Crawls
          </Button>
        </div>

        <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
          <strong>Trigger Processing:</strong> Manually starts processing of pending pages<br />
          <strong>Auto-Recover:</strong> Detects and recovers crawls stuck for 10+ minutes
        </div>
      </CardContent>
    </Card>
  );
};

export default CrawlRecoveryPanel;
