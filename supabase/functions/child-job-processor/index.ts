import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { childJobId } = await req.json();

    console.log(`🔄 Processing child job: ${childJobId}`);

    // Get the child job details
    const { data: childJob, error: fetchError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('id', childJobId)
      .single();

    if (fetchError || !childJob) {
      throw new Error(`Child job not found: ${childJobId}`);
    }

    // Mark job as in progress
    await supabaseClient
      .from('source_pages')
      .update({ 
        status: 'in_progress', 
        started_at: new Date().toISOString() 
      })
      .eq('id', childJobId);

    const startTime = Date.now();

    try {
      // Fetch and process the page
      const result = await processPage(childJob.url);
      
      const processingTime = Date.now() - startTime;

      // Update child job as completed
      await supabaseClient
        .from('source_pages')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          content_size: result.contentSize,
          compression_ratio: result.compressionRatio,
          chunks_created: result.chunksCreated,
          duplicates_found: result.duplicatesFound,
          processing_time_ms: processingTime,
          content_hash: result.contentHash
        })
        .eq('id', childJobId);

      console.log(`✅ Child job ${childJobId} completed successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          childJobId,
          processingTimeMs: processingTime,
          result
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (processingError) {
      console.error(`❌ Error processing child job ${childJobId}:`, processingError);
      
      // Update child job as failed
      await supabaseClient
        .from('source_pages')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: processingError.message,
          retry_count: childJob.retry_count + 1
        })
        .eq('id', childJobId);

      throw processingError;
    }

  } catch (error) {
    console.error('❌ Child job processor error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processPage(url: string) {
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  
  // Extract main content (simplified version)
  const cleanedContent = extractMainContent(html);
  
  // Simulate compression and chunking (actual implementation would use Zstd)
  const originalSize = cleanedContent.length;
  const compressedSize = Math.floor(originalSize * 0.3); // Simulate 70% compression
  const compressionRatio = compressedSize / originalSize;
  
  // Simulate chunking
  const chunks = Math.ceil(cleanedContent.length / 500); // ~500 chars per chunk
  const duplicates = Math.floor(chunks * 0.1); // Simulate 10% duplicates
  
  // Create content hash
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanedContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    contentSize: originalSize,
    compressionRatio,
    chunksCreated: chunks - duplicates,
    duplicatesFound: duplicates,
    contentHash: contentHash.substring(0, 16) // Truncate for storage
  };
}

function extractMainContent(html: string): string {
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags but keep text
  content = content.replace(/<[^>]*>/g, ' ');
  
  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  // Remove common boilerplate phrases
  const boilerplate = [
    'click here', 'read more', 'subscribe now', 'follow us',
    'privacy policy', 'terms of service', 'cookie policy'
  ];
  
  boilerplate.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    content = content.replace(regex, '');
  });
  
  return content;
}
