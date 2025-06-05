
import { supabase } from '@/integrations/supabase/client';

interface DatabaseSource {
  id: string;
  source_type: string;
  metadata: any;
  title: string;
  content?: string;
}

export class SourceProcessor {
  static async processSource(source: DatabaseSource): Promise<boolean> {
    try {
      console.log(`🔄 Processing source: ${source.title} (${source.source_type})`);
      
      if (source.source_type === 'website') {
        // For website sources, trigger processing of unprocessed pages
        const { error } = await supabase.functions.invoke('process-source-pages', {
          body: { sourceId: source.id }
        });
        
        if (error) {
          console.error(`❌ Failed to process website source ${source.id}:`, error);
          return false;
        }
        
        console.log(`✅ Website source processing initiated: ${source.title}`);
        return true;
      } else {
        // For non-website sources, update metadata to mark as processing
        const metadata = (source.metadata as Record<string, any>) || {};
        const updatedMetadata = {
          ...metadata,
          processing_status: 'processing',
          last_processing_attempt: new Date().toISOString()
        };

        const { error } = await supabase
          .from('agent_sources')
          .update({ metadata: updatedMetadata })
          .eq('id', source.id);

        if (error) {
          console.error(`❌ Failed to update source ${source.id}:`, error);
          return false;
        }

        // Trigger actual processing via edge function
        const { error: processingError } = await supabase.functions.invoke('process-page-content', {
          body: { sourceId: source.id }
        });

        if (processingError) {
          console.error(`❌ Failed to process content for source ${source.id}:`, processingError);
          
          // Mark as failed
          const failedMetadata = {
            ...metadata,
            processing_status: 'failed',
            error_message: processingError.message,
            failed_at: new Date().toISOString()
          };

          await supabase
            .from('agent_sources')
            .update({ metadata: failedMetadata })
            .eq('id', source.id);
          
          return false;
        }

        console.log(`✅ Non-website source processing initiated: ${source.title}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Error processing source ${source.id}:`, error);
      return false;
    }
  }
}
