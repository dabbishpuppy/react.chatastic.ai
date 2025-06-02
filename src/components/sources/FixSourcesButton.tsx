
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FixSourcesResult {
  success: boolean;
  fixed_sources: number;
  timestamp: string;
}

const FixSourcesButton: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [lastResult, setLastResult] = useState<FixSourcesResult | null>(null);

  const handleFixSources = async () => {
    setIsFixing(true);
    try {
      console.log('🔧 Triggering fix for existing parent sources...');
      
      const { data, error } = await supabase.rpc('fix_existing_parent_sources');
      
      if (error) {
        throw error;
      }
      
      // Safe casting with unknown first
      const result = data as unknown as FixSourcesResult;
      setLastResult(result);
      
      toast({
        title: "Sources Fixed",
        description: `Successfully fixed ${result.fixed_sources} parent sources with missing size data.`,
      });
      
      console.log('✅ Fix completed:', result);
      
      // Trigger a page refresh or emit a custom event to refresh stats
      window.dispatchEvent(new CustomEvent('sourcesFixed'));
      
    } catch (error) {
      console.error('❌ Failed to fix sources:', error);
      toast({
        title: "Fix Failed",
        description: "Failed to fix sources. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleFixSources}
        disabled={isFixing}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        <RefreshCw className={`w-3 h-3 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
        {isFixing ? 'Fixing Sources...' : 'Fix Missing Sizes'}
      </Button>
      
      {lastResult && (
        <div className="flex items-center gap-2 text-xs">
          {lastResult.fixed_sources > 0 ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Fixed {lastResult.fixed_sources} sources</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-orange-600">No sources needed fixing</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FixSourcesButton;
