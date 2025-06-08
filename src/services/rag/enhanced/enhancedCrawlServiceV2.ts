
import { supabase } from "@/integrations/supabase/client";

export class EnhancedCrawlService {
  static async startSourcePageProcessing(parentSourceId?: string): Promise<any> {
    try {
      console.log('🔄 Starting source page processing with enhanced error handling');
      
      const requestBody = parentSourceId ? { parentSourceId } : {};
      
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Edge function invocation error:', error);
        throw new Error(`Source page processing failed: ${error.message}`);
      }

      // Check if the response indicates an error
      if (data && !data.success) {
        console.error('❌ Source page processing returned error:', data);
        throw new Error(data.error || 'Unknown error occurred during source page processing');
      }

      console.log('✅ Source page processing completed:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Enhanced source page processing error:', error);
      
      // If it's a FunctionsHttpError, try to extract more details
      if (error.name === 'FunctionsHttpError') {
        console.error('❌ HTTP Error Details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message
        });
      }
      
      // Re-throw with enhanced error message
      throw new Error(`Source page processing failed: ${error.message || 'Unknown error'}`);
    }
  }

  static async processSpecificSource(parentSourceId: string, maxConcurrentJobs = 5): Promise<any> {
    try {
      console.log(`🔄 Processing specific source: ${parentSourceId}`);
      
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: { parentSourceId, maxConcurrentJobs }
      });

      if (error) {
        console.error('❌ Edge function invocation error:', error);
        throw new Error(`Specific source processing failed: ${error.message}`);
      }

      if (data && !data.success) {
        console.error('❌ Specific source processing returned error:', data);
        throw new Error(data.error || 'Unknown error occurred during specific source processing');
      }

      console.log('✅ Specific source processing completed:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Enhanced specific source processing error:', error);
      throw new Error(`Specific source processing failed: ${error.message || 'Unknown error'}`);
    }
  }

  static async retryFailedPages(parentSourceId: string): Promise<any> {
    try {
      console.log(`🔄 Retrying failed pages for source: ${parentSourceId}`);
      
      // First, reset failed pages to pending status
      const { error: resetError } = await supabase
        .from('source_pages')
        .update({ status: 'pending', error_message: null })
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed');

      if (resetError) {
        throw new Error(`Failed to reset failed pages: ${resetError.message}`);
      }

      // Then process the source again
      return await this.processSpecificSource(parentSourceId);
      
    } catch (error: any) {
      console.error('❌ Retry failed pages error:', error);
      throw new Error(`Retry failed pages failed: ${error.message || 'Unknown error'}`);
    }
  }
}

// Re-export for backward compatibility
export * from './enhancedCrawlService';
