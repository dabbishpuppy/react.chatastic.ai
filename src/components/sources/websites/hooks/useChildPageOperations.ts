
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChildPage {
  id: string;
  url: string;
  status: string;
  parent_source_id: string;
}

export const useChildPageOperations = () => {
  const [isLoading, setIsLoading] = useState(false);

  const recrawlChildPage = async (childPage: ChildPage) => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting child page recrawl for:', childPage.url);

      // First, update the child page status to pending
      const { error: updateError } = await supabase
        .from('source_pages')
        .update({
          status: 'pending',
          error_message: null,
          started_at: null,
          completed_at: null,
          retry_count: 0
        })
        .eq('id', childPage.id);

      if (updateError) {
        console.error('Error updating child page status:', updateError);
        throw new Error(`Failed to update page status: ${updateError.message}`);
      }

      // Get the parent source to determine team_id and agent_id
      const { data: parentSource, error: parentError } = await supabase
        .from('agent_sources')
        .select('agent_id, team_id')
        .eq('id', childPage.parent_source_id)
        .single();

      if (parentError || !parentSource) {
        console.error('Error fetching parent source:', parentError);
        throw new Error('Failed to fetch parent source information');
      }

      // Call the enhanced crawl function to process this specific page
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          agentId: parentSource.agent_id,
          url: childPage.url,
          crawlMode: 'single-page',
          maxPages: 1,
          excludePaths: [],
          includePaths: [],
          respectRobots: true,
          enableCompression: true,
          enableDeduplication: true,
          priority: 'high',
          parentSourceId: childPage.parent_source_id // Pass the existing parent source ID
        }
      });

      if (error) {
        console.error('Enhanced crawl error:', error);
        
        // Update the page status back to failed if crawl initiation failed
        await supabase
          .from('source_pages')
          .update({
            status: 'failed',
            error_message: `Recrawl failed: ${error.message}`
          })
          .eq('id', childPage.id);

        throw new Error(`Recrawl failed: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('Enhanced crawl failed:', data);
        throw new Error(data?.error || 'Unknown error occurred during recrawl');
      }

      console.log('✅ Child page recrawl initiated successfully:', data);
      toast.success(`Recrawl started for ${childPage.url}`);

    } catch (error: any) {
      console.error('❌ Child page recrawl error:', error);
      toast.error(`Failed to recrawl: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    recrawlChildPage,
    isLoading
  };
};
