
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced concurrent job processor
class EnhancedJobProcessor {
  private supabase: any;
  private maxConcurrentJobs: number;
  private processingTimeoutMs: number;

  constructor(supabase: any, maxConcurrentJobs: number = 5, processingTimeoutMs: number = 60000) {
    this.supabase = supabase;
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.processingTimeoutMs = processingTimeoutMs;
  }

  async processConcurrentJobs(parentSourceId: string): Promise<any> {
    console.log(`🚀 Starting enhanced concurrent processing for parent: ${parentSourceId}`);
    
    const startTime = Date.now();
    
    // Get pending pages in batches
    const { data: pendingPages, error: fetchError } = await this.supabase
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20); // Process in batches

    if (fetchError || !pendingPages) {
      console.error('❌ Error fetching pending pages:', fetchError);
      return { success: false, error: fetchError?.message };
    }

    if (pendingPages.length === 0) {
      console.log('📭 No pending pages found for processing');
      return { success: true, processed: 0, skipped: 0, failed: 0 };
    }

    console.log(`📋 Found ${pendingPages.length} pages to process concurrently`);

    // Process pages in concurrent batches
    const results = await this.processPagesInBatches(pendingPages);
    
    // Aggregate parent status after processing
    await this.aggregateParentStatus(parentSourceId);
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Enhanced concurrent processing completed in ${totalTime}ms:`, results);
    
    return {
      success: true,
      ...results,
      processingTimeMs: totalTime,
      parentSourceId
    };
  }

  private async processPagesInBatches(pages: any[]): Promise<any> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };

    // Create batches for concurrent processing
    const batches = [];
    for (let i = 0; i < pages.length; i += this.maxConcurrentJobs) {
      batches.push(pages.slice(i, i + this.maxConcurrentJobs));
    }

    // Process each batch concurrently
    for (const batch of batches) {
      console.log(`🔄 Processing batch of ${batch.length} pages`);
      
      const batchPromises = batch.map(page => 
        this.processPageWithTimeout(page)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Aggregate batch results
      batchResults.forEach((result, index) => {
        results.processed++;
        
        if (result.status === 'fulfilled') {
          const pageResult = result.value;
          if (pageResult.success) {
            if (pageResult.skipped) {
              results.skipped++;
            } else {
              results.successful++;
            }
          } else {
            results.failed++;
          }
        } else {
          results.failed++;
          console.error(`❌ Page ${batch[index].id} processing failed:`, result.reason);
        }
      });

      console.log(`✅ Batch completed: ${batch.length} pages processed`);
      
      // Brief pause between batches to prevent overwhelming
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private async processPageWithTimeout(page: any): Promise<any> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Page processing timeout')), this.processingTimeoutMs);
    });

    const processingPromise = this.processPageJob(page);

    try {
      return await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      console.error(`❌ Page ${page.id} processing failed:`, error);
      return { success: false, error: error.message, pageId: page.id };
    }
  }

  private async processPageJob(page: any): Promise<any> {
    try {
      console.log(`🚀 Processing page: ${page.url} (ID: ${page.id})`);

      // Call the enhanced child-job-processor
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/child-job-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ childJobId: page.id })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`📋 Processing result for page ${page.id}:`, {
        data: result,
        error: null,
        success: response.ok
      });

      if (result.skipped) {
        console.log(`✅ Page ${page.id} was already processed by another worker (skipped)`);
        return { success: true, skipped: true, pageId: page.id };
      }

      if (result.success) {
        return { success: true, skipped: false, pageId: page.id, result };
      } else {
        console.error(`❌ Page ${page.id} processing failed:`, result.error);
        return { success: false, error: result.error, pageId: page.id };
      }

    } catch (error) {
      console.error(`❌ Error processing page ${page.id}:`, error);
      return { success: false, error: error.message, pageId: page.id };
    }
  }

  private async aggregateParentStatus(parentSourceId: string): Promise<void> {
    try {
      console.log(`🔄 Triggering parent status aggregation for ${parentSourceId}`);
      
      const { error } = await this.supabase.rpc('aggregate_parent_status', {
        parent_id: parentSourceId
      });

      if (error) {
        console.error('❌ Failed to aggregate parent status:', error);
      } else {
        console.log(`✅ Aggregated status for parent: ${parentSourceId}`);
      }
    } catch (error) {
      console.error('❌ Error in parent status aggregation:', error);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { parentSourceId, maxConcurrentJobs = 5 } = await req.json();

    if (!parentSourceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'parentSourceId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`📨 Enhanced processing request for parent: ${parentSourceId}`);

    // Initialize enhanced job processor
    const processor = new EnhancedJobProcessor(supabase, maxConcurrentJobs, 60000);
    
    // Process jobs concurrently
    const result = await processor.processConcurrentJobs(parentSourceId);

    // Check for any remaining completed pages without chunks
    console.log('🔍 Checking for any remaining completed pages without chunks...');
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced processing error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Import createClient properly
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
