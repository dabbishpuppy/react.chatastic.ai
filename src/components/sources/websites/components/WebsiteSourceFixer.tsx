
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SourcePagesStats } from '@/services/rag/enhanced/crawlTypes';

const WebsiteSourceFixer: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { agentId } = useParams();

  const runFixes = async () => {
    setIsFixing(true);
    setError(null);
    setStatus('Running fixes...');
    
    try {
      // Call the edge function to fix RLS policies and create functions
      setStatus('Fixing database access policies...');
      const { data, error } = await supabase.functions.invoke('fix-source-pages-access', {});
      
      if (error) {
        console.error('Error fixing source pages access:', error);
        setError(`Failed to fix database access: ${error.message}`);
        return;
      }
      
      setStatus('Database policies updated.');
      
      // Fix any parent sources with missing child links counts
      setStatus('Updating parent sources...');
      const { data: sources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .is('parent_source_id', null);  // Only parent sources
      
      if (sourcesError) {
        console.error('Error fetching parent sources:', sourcesError);
        setError(`Failed to fetch parent sources: ${sourcesError.message}`);
        return;
      }
      
      if (sources && sources.length > 0) {
        setStatus(`Syncing ${sources.length} parent sources with their child pages...`);
        
        for (const source of sources) {
          // For each parent source, count its child pages
          const { data: statsData, error: statsError } = await supabase
            .rpc<SourcePagesStats>('get_source_pages_stats', { 
              parent_source_id_param: source.id
            });
          
          if (statsError) {
            console.error(`Error getting stats for source ${source.id}:`, statsError);
            continue;
          }
          
          const stats = statsData as SourcePagesStats;
          
          if (stats && stats.total_count > 0) {
            // Calculate status based on counts
            let newStatus = 'pending';
            if (stats.total_count === stats.completed_count + stats.failed_count) {
              newStatus = 'completed';
            } else if (stats.completed_count > 0 || stats.in_progress_count > 0) {
              newStatus = 'in_progress';
            }
            
            // Calculate progress percentage
            const progress = Math.round(
              ((stats.completed_count + stats.failed_count) / stats.total_count) * 100
            );
            
            // Update the parent source to match the actual child page stats
            await supabase
              .from('agent_sources')
              .update({
                links_count: stats.total_count,
                progress: progress,
                crawl_status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', source.id);
          }
        }
        
        setStatus('All parent sources have been synced with their child pages.');
      } else {
        setStatus('No parent sources found to sync.');
      }
      
      window.location.reload(); // Refresh the page to see the changes
    } catch (err: any) {
      console.error('Error in runFixes:', err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="font-medium mb-2">Website Sources Data Sync</h3>
      <p className="text-sm text-gray-600 mb-4">
        If your website sources are stuck on "Pending" or child pages aren't showing, 
        click the button below to fix database permissions and sync parent sources.
      </p>
      
      {error && (
        <div className="text-sm text-red-600 p-2 mb-3 bg-red-50 border border-red-100 rounded">
          {error}
        </div>
      )}
      
      {status && !error && (
        <div className="text-sm text-green-600 p-2 mb-3 bg-green-50 border border-green-100 rounded">
          {status}
        </div>
      )}
      
      <Button 
        onClick={runFixes} 
        disabled={isFixing}
        className="w-full"
      >
        {isFixing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running fixes...
          </>
        ) : (
          'Fix Website Sources'
        )}
      </Button>
    </div>
  );
};

export default WebsiteSourceFixer;
