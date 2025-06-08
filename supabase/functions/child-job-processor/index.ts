
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient, updateJobStatus, insertChunks } from '../_shared/database-helpers.ts';
import { extractTextContent, extractTitle, createSemanticChunks, generateContentHash } from '../_shared/content-processing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced job claiming with atomic operations
async function claimJobAtomically(supabaseClient: any, jobId: string): Promise<any> {
  const { data: claimedJob, error: claimError } = await supabaseClient
    .from('source_pages')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .eq('status', 'pending') // Only claim if still pending
    .select()
    .single();

  if (claimError || !claimedJob) {
    return { success: false, error: claimError, job: null };
  }

  return { success: true, error: null, job: claimedJob };
}

// Enhanced job processing with timeout and retry logic
async function processJobWithTimeout(jobProcessor: () => Promise<any>, timeoutMs: number = 30000): Promise<any> {
  return Promise.race([
    jobProcessor(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Job processing timeout')), timeoutMs)
    )
  ]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = getSupabaseClient();
    const requestBody = await req.json();
    
    const childJobId = requestBody.childJobId || requestBody.pageId || requestBody.jobId;
    
    console.log('📨 Received enhanced job processing request:', JSON.stringify(requestBody, null, 2));
    
    if (!childJobId) {
      console.error('❌ Missing required parameter');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameter: childJobId is required',
          receivedParams: Object.keys(requestBody),
          expectedParams: ['childJobId', 'pageId', 'jobId']
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`🚀 Processing job with enhanced claiming: ${childJobId}`);

    // ENHANCED: Atomic job claiming
    const claimResult = await claimJobAtomically(supabaseClient, childJobId);
    
    if (!claimResult.success) {
      console.log(`⚠️ Job ${childJobId} could not be claimed:`, claimResult.error?.message || 'Job not found or already claimed');
      
      // Check if job exists but is in different status
      const { data: existingJob } = await supabaseClient
        .from('source_pages')
        .select('id, status, url')
        .eq('id', childJobId)
        .single();
        
      if (existingJob) {
        console.log(`📊 Job ${childJobId} exists with status: ${existingJob.status}`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Job already processed or in progress (status: ${existingJob.status})`,
            jobId: childJobId,
            currentStatus: existingJob.status,
            skipped: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        console.error(`❌ Job ${childJobId} not found in source_pages table`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Job ${childJobId} not found in source_pages table`,
            jobId: childJobId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
    }

    const claimedJob = claimResult.job;
    console.log(`✅ Successfully claimed job ${childJobId} for URL: ${claimedJob.url}`);

    // Validate parent source exists
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('id, agent_id')
      .eq('id', claimedJob.parent_source_id)
      .single();

    if (parentError || !parentSource) {
      await updateJobStatus(supabaseClient, childJobId, 'failed', {
        error_message: `Parent source not found: ${parentError?.message}`
      });
      throw new Error(`Parent source not found: ${parentError?.message}`);
    }

    // ENHANCED: Process job with timeout protection
    const jobStartTime = Date.now();
    
    const processingResult = await processJobWithTimeout(async () => {
      console.log(`📄 Crawling URL: ${claimedJob.url}`);

      // Check for duplicate URLs
      const { data: existingPages, error: duplicateCheckError } = await supabaseClient
        .from('source_pages')
        .select('id, status, url')
        .eq('parent_source_id', claimedJob.parent_source_id)
        .eq('url', claimedJob.url)
        .eq('status', 'completed')
        .neq('id', childJobId);

      if (!duplicateCheckError && existingPages && existingPages.length > 0) {
        console.log(`⚠️ URL ${claimedJob.url} already processed successfully by page ${existingPages[0].id}`);
        
        const processingTime = Date.now() - jobStartTime;
        await updateJobStatus(supabaseClient, childJobId, 'completed', {
          content_size: 0,
          chunks_created: 0,
          processing_time_ms: processingTime,
          error_message: `Duplicate URL - already processed by page ${existingPages[0].id}`,
          processing_status: 'processed'
        });

        return {
          success: true,
          jobId: childJobId,
          parentSourceId: claimedJob.parent_source_id,
          contentSize: 0,
          chunksCreated: 0,
          message: 'Duplicate URL detected - skipped processing',
          duplicateOf: existingPages[0].id
        };
      }

      // Enhanced HTTP fetching with retry logic
      let response;
      let attempts = 0;
      const maxAttempts = 3;
      const fetchErrors = [];

      while (attempts < maxAttempts) {
        try {
          console.log(`🌐 Fetching URL (attempt ${attempts + 1}/${maxAttempts}): ${claimedJob.url}`);
          
          response = await fetch(claimedJob.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(30000)
          });

          if (response.ok) {
            console.log(`✅ Successfully fetched ${claimedJob.url} (status: ${response.status})`);
            break;
          }
          
          fetchErrors.push(`HTTP ${response.status}: ${response.statusText}`);
          attempts++;
          
          if (attempts < maxAttempts) {
            const backoffDelay = 1000 * Math.pow(2, attempts);
            console.log(`⏳ Retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        } catch (error) {
          fetchErrors.push(error.message);
          attempts++;
          
          if (attempts < maxAttempts) {
            const backoffDelay = 1000 * Math.pow(2, attempts);
            console.log(`⏳ Fetch error, retrying in ${backoffDelay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      }

      if (!response || !response.ok) {
        const errorMessage = `Failed to fetch after ${maxAttempts} attempts: ${fetchErrors.join(', ')}`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const htmlContent = await response.text();
      const textContent = extractTextContent(htmlContent);
      const contentSize = textContent.length;

      console.log(`📏 Content extracted: ${contentSize} characters from ${claimedJob.url}`);

      // Enhanced content validation
      if (contentSize < 10) {
        console.warn(`⚠️ Very short content (${contentSize} chars) for ${claimedJob.url}, checking for title`);
        
        const title = extractTitle(htmlContent);
        if (title && title.length > 5) {
          const fallbackContent = `Page Title: ${title}\nURL: ${claimedJob.url}`;
          console.log(`📝 Using fallback content with title: "${title}"`);
          
          const processingTime = Date.now() - jobStartTime;
          await updateJobStatus(supabaseClient, childJobId, 'completed', {
            content_size: fallbackContent.length,
            chunks_created: 0,
            processing_time_ms: processingTime,
            content_hash: await generateContentHash(fallbackContent),
            processing_status: 'pending',
            error_message: `Short content with title fallback: ${title}`
          });

          return {
            success: true,
            jobId: childJobId,
            parentSourceId: claimedJob.parent_source_id,
            contentSize: fallbackContent.length,
            chunksCreated: 0,
            message: 'Page crawled with title fallback - ready for manual training',
            title: title
          };
        } else {
          throw new Error(`No meaningful content found for ${claimedJob.url} (${contentSize} chars, no usable title)`);
        }
      }

      // Generate content hash for deduplication
      const contentHash = await generateContentHash(textContent);

      // Content-based deduplication
      const { data: duplicateContent, error: contentDupeError } = await supabaseClient
        .from('source_pages')
        .select('id, url')
        .eq('parent_source_id', claimedJob.parent_source_id)
        .eq('content_hash', contentHash)
        .eq('status', 'completed')
        .neq('id', childJobId)
        .limit(1);

      if (!contentDupeError && duplicateContent && duplicateContent.length > 0) {
        console.log(`⚠️ Content from ${claimedJob.url} matches existing page ${duplicateContent[0].id} (${duplicateContent[0].url})`);
        
        const processingTime = Date.now() - jobStartTime;
        await updateJobStatus(supabaseClient, childJobId, 'completed', {
          content_size: contentSize,
          chunks_created: 0,
          processing_time_ms: processingTime,
          content_hash: contentHash,
          processing_status: 'processed',
          error_message: `Duplicate content of ${duplicateContent[0].url} (page ${duplicateContent[0].id})`
        });

        return {
          success: true,
          jobId: childJobId,
          parentSourceId: claimedJob.parent_source_id,
          contentSize,
          chunksCreated: 0,
          message: 'Duplicate content detected - skipped processing',
          duplicateContentOf: duplicateContent[0].id
        };
      }

      // Store the crawled content metadata for future processing
      await supabaseClient
        .from('source_pages')
        .update({
          content_hash: contentHash,
          content_size: contentSize,
          processing_status: 'pending',
          metadata: {
            title: extractTitle(htmlContent),
            crawled_at: new Date().toISOString(),
            ready_for_processing: true,
            http_status: response.status,
            content_type: response.headers.get('content-type') || 'text/html'
          }
        })
        .eq('id', childJobId);

      // Mark job as completed (crawled successfully)
      const processingTime = Date.now() - jobStartTime;
      await updateJobStatus(supabaseClient, childJobId, 'completed', {
        content_size: contentSize,
        chunks_created: 0,
        processing_time_ms: processingTime,
        content_hash: contentHash,
        processing_status: 'pending'
      });

      // Mark parent source as requiring manual training
      await supabaseClient
        .from('agent_sources')
        .update({ requires_manual_training: true })
        .eq('id', claimedJob.parent_source_id);

      console.log(`✅ Successfully crawled page ${childJobId} - content ready for manual training`);

      return {
        success: true,
        jobId: childJobId,
        parentSourceId: claimedJob.parent_source_id,
        contentSize,
        chunksCreated: 0,
        message: 'Page crawled successfully - ready for manual training'
      };
    }, 60000); // 60 second timeout

    return new Response(
      JSON.stringify(processingResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Enhanced job processing error:', error);

    try {
      const requestBody = await req.json().catch(() => ({}));
      const childJobId = requestBody.childJobId || requestBody.pageId || requestBody.jobId;
      
      if (childJobId) {
        const supabaseClient = getSupabaseClient();
        await updateJobStatus(supabaseClient, childJobId, 'failed', {
          error_message: error.message,
          processing_time_ms: 0
        });
        console.log(`📝 Updated job ${childJobId} status to failed`);
      }
    } catch (updateError) {
      console.error('❌ Failed to update job status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
