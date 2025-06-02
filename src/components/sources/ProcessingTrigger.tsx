
import React from 'react';
import { Button } from '@/components/ui/button';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { RefreshCw } from 'lucide-react';

interface ProcessingTriggerProps {
  className?: string;
}

const ProcessingTrigger: React.FC<ProcessingTriggerProps> = ({ className }) => {
  const { triggerProcessing, loading } = useEnhancedCrawl();

  const handleTriggerProcessing = async () => {
    try {
      await triggerProcessing();
    } catch (error) {
      console.error('Failed to trigger processing:', error);
    }
  };

  return (
    <Button
      onClick={handleTriggerProcessing}
      disabled={loading}
      variant="outline"
      size="sm"
      className={className}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Processing...' : 'Process Pending Pages'}
    </Button>
  );
};

export default ProcessingTrigger;
