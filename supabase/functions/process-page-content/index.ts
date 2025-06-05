
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { pageId, sourceId } = requestBody;

    // Handle both pageId (for website pages) and sourceId (for direct sources)
    if (!pageId && !sourceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Either pageId or sourceId is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (sourceId) {
      // Handle direct source processing (non-website sources)
      console.log(`🔄 Processing direct source: ${sourceId}`);

      // Use sequential processing for direct sources to avoid race conditions
      const result = await supabase.functions.invoke('process-source-sequential', {
        body: { sourceId }
      });

      if (result.error) {
        console.error('❌ Sequential processing failed:', result.error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Sequential processing failed: ${result.error.message}`,
            sourceId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result.data || { message: 'Source processed successfully', sourceId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original pageId processing logic with enhanced error handling...
    console.log(`🔄 Processing content for page: ${pageId}`);

    // ATOMIC UPDATE: Use proper concurrency control for processing_status
    const { data: updateResult, error: lockError } = await supabase
      .from('source_pages')
      .update({ 
        processing_status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .eq('status', 'completed') // Only process completed crawled pages
      .in('processing_status', ['pending', null]) // Only update if not already being processed
      .select()
      .single();

    if (lockError || !updateResult) {
      console.log(`⏭️ Page ${pageId} already being processed, not crawled yet, or doesn't exist`);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Page is already being processed, not crawled yet, or does not exist',
          pageId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      );
    }

    const page = updateResult;
    console.log(`📄 Successfully locked page for processing: ${page.url}`);

    // Re-fetch the content to process it with enhanced retry logic
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await fetch(page.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          break;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Attempt ${attempts} failed for ${page.url}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error(`❌ Failed to fetch after ${maxAttempts} attempts:`, error);
          
          // Mark page as failed
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'failed',
              error_message: `Failed to fetch after ${maxAttempts} attempts: ${error.message}`,
              completed_at: new Date().toISOString()
            })
            .eq('id', pageId);
            
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to fetch page content after ${maxAttempts} attempts: ${error.message}`,
              pageId
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 502,
            }
          );
        }
        console.log(`Attempt ${attempts} failed for ${page.url}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!response || !response.ok) {
      await supabase
        .from('source_pages')
        .update({ 
          processing_status: 'failed',
          error_message: `Failed to fetch page content: HTTP ${response?.status}: ${response?.statusText}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', pageId);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch page content: HTTP ${response?.status}: ${response?.statusText}`,
          pageId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        }
      );
    }

    let htmlContent;
    try {
      htmlContent = await response.text();
    } catch (error) {
      console.error(`❌ Failed to read response text:`, error);
      
      await supabase
        .from('source_pages')
        .update({ 
          processing_status: 'failed',
          error_message: `Failed to read response text: ${error.message}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', pageId);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to read response text: ${error.message}`,
          pageId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        }
      );
    }
    
    // Simple content extraction (similar to what's in child-job-processor)
    const extractTextContent = (html) => {
      let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
      text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
      text = text.replace(/<[^>]*>/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    };

    const extractTitle = (html) => {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : '';
    };

    const generateContentHash = async (content) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const textContent = extractTextContent(htmlContent);
    const contentSize = textContent.length;

    console.log(`📏 Content extracted: ${contentSize} characters from ${page.url}`);

    // Handle minimal content case
    if (contentSize < 10) {
      const title = extractTitle(htmlContent);
      if (title && title.length > 0) {
        const fallbackContent = `Page: ${title}`;
        
        try {
          // Use the new sequential processing service for better reliability
          const result = await supabase.functions.invoke('process-source-sequential', {
            body: { 
              sourceId: page.parent_source_id,
              content: fallbackContent,
              metadata: {
                url: page.url,
                page_id: page.id,
                extraction_method: 'title_fallback',
                page_title: title,
                original_content_length: textContent.length
              }
            }
          });

          if (result.error) {
            throw new Error(`Sequential processing failed: ${result.error.message}`);
          }

          // Mark page as processed
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'processed',
              chunks_created: 1,
              content_size: contentSize,
              completed_at: new Date().toISOString()
            })
            .eq('id', pageId);
            
          console.log(`✅ Page ${pageId} marked as processed (fallback content)`);

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                chunksCreated: 1,
                message: 'Processed with title fallback',
                pageId
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('❌ Unexpected error with fallback processing:', error);
          
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'failed',
              error_message: `Fallback processing failed: ${error.message}`,
              completed_at: new Date().toISOString()
            })
            .eq('id', pageId);

          return new Response(
            JSON.stringify({
              success: false,
              error: `Fallback processing failed: ${error.message}`,
              pageId
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      } else {
        await supabase
          .from('source_pages')
          .update({ 
            processing_status: 'failed',
            error_message: `No meaningful content found for ${page.url}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', pageId);

        return new Response(
          JSON.stringify({
            success: false,
            error: `No meaningful content found for ${page.url}`,
            pageId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 422,
          }
        );
      }
    }

    // For normal content, use sequential processing
    try {
      const title = extractTitle(htmlContent);
      const contentHash = await generateContentHash(textContent);

      // Use the new sequential processing service
      const result = await supabase.functions.invoke('process-source-sequential', {
        body: { 
          sourceId: page.parent_source_id,
          content: textContent,
          metadata: {
            url: page.url,
            page_id: page.id,
            content_hash: contentHash,
            extraction_method: 'semantic_chunking',
            page_title: title,
            original_content_length: textContent.length
          }
        }
      });

      if (result.error) {
        throw new Error(`Sequential processing failed: ${result.error.message}`);
      }

      const chunksCreated = result.data?.chunksCreated || 0;

      // Mark page as processed with detailed metrics
      await supabase
        .from('source_pages')
        .update({ 
          processing_status: 'processed',
          chunks_created: chunksCreated,
          content_size: contentSize,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - new Date(page.started_at || page.created_at).getTime(),
          compression_ratio: contentSize > 0 ? textContent.length / contentSize : 1.0
        })
        .eq('id', pageId);
        
      console.log(`✅ Page ${pageId} marked as processed with ${chunksCreated} chunks`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            chunksCreated,
            embeddingsGenerated: result.data?.embeddingsGenerated || 0,
            message: 'Content processed successfully',
            pageId
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('❌ Unexpected error in sequential processing:', error);
      
      await supabase
        .from('source_pages')
        .update({ 
          processing_status: 'failed',
          error_message: `Sequential processing failed: ${error.message}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', pageId);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Sequential processing failed: ${error.message}`,
          pageId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

  } catch (error) {
    console.error('❌ Unexpected error in content processing:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${error.message}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
