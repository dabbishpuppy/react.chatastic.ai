
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

    const { pageId, forceReprocess = false } = requestBody;

    if (!pageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'pageId is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`🔄 Processing content for page: ${pageId} (force: ${forceReprocess})`);

    // ENHANCED: More flexible processing conditions
    let updateConditions = ['id = ?', pageId];
    let updateParams = [pageId];

    if (forceReprocess) {
      // For forced reprocessing, allow any page that exists
      console.log('🔄 Force reprocessing enabled - will process any existing page');
    } else {
      // Original logic - only process completed crawled pages that aren't being processed
      updateConditions.push("status = 'completed'");
      updateConditions.push("processing_status IN ('pending') OR processing_status IS NULL");
    }

    // FIXED: Use more flexible atomic update for processing_status
    const { data: updateResult, error: lockError } = await supabase
      .from('source_pages')
      .update({ 
        processing_status: 'processing',
        started_at: new Date().toISOString(),
        error_message: null // Clear any previous errors
      })
      .eq('id', pageId)
      .or(forceReprocess 
        ? 'status.in.(completed,failed,processed)' // Allow reprocessing of completed, failed, or processed pages
        : 'status.eq.completed,processing_status.is.null,processing_status.eq.pending'
      )
      .select()
      .single();

    if (lockError || !updateResult) {
      console.log(`⏭️ Page ${pageId} cannot be processed: ${lockError?.message || 'conditions not met'}`);
      
      // Get page info for better error message
      const { data: pageInfo } = await supabase
        .from('source_pages')
        .select('status, processing_status, url')
        .eq('id', pageId)
        .single();

      return new Response(
        JSON.stringify({
          success: false,
          message: forceReprocess 
            ? `Page cannot be reprocessed: ${lockError?.message || 'unknown error'}`
            : 'Page is already being processed, not crawled yet, or does not exist',
          pageId,
          currentStatus: pageInfo?.status,
          currentProcessingStatus: pageInfo?.processing_status,
          pageUrl: pageInfo?.url
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        }
      );
    }

    const page = updateResult;
    console.log(`📄 Successfully locked page for processing: ${page.url}`);

    // ENHANCED: Clear existing chunks before reprocessing to avoid incomplete data
    if (forceReprocess) {
      console.log('🗑️ Clearing existing chunks for reprocessing...');
      
      // More thorough chunk clearing - use multiple strategies to find and remove chunks
      const { error: deleteError1 } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', page.parent_source_id)
        .like('metadata->>page_id', pageId);
      
      if (deleteError1) {
        console.warn('⚠️ Method 1: Failed to clear existing chunks:', deleteError1);
      }
      
      // Try alternative metadata key
      const { error: deleteError2 } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', page.parent_source_id)
        .like('metadata->>pageId', pageId);
        
      if (deleteError2) {
        console.warn('⚠️ Method 2: Failed to clear existing chunks:', deleteError2);
      }
      
      // Try URL-based clearing
      const { error: deleteError3 } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', page.parent_source_id)
        .like('metadata->>url', page.url);
        
      if (deleteError3) {
        console.warn('⚠️ Method 3: Failed to clear existing chunks:', deleteError3);
      } else {
        console.log('✅ Existing chunks cleared via URL match');
      }
    }
    
    // Re-fetch the content to process it
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

    // ENHANCED: Improved semantic chunking with better size limits
    const createSemanticChunks = (content, maxTokens = 200) => {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
      const chunks = [];
      let currentChunk = '';
      let tokenCount = 0;

      for (const sentence of sentences) {
        const sentenceTokens = sentence.trim().split(/\s+/).length;
        
        if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
          if (currentChunk.trim().length > 30) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
          tokenCount = sentenceTokens;
        } else {
          currentChunk += (currentChunk ? '. ' : '') + sentence;
          tokenCount += sentenceTokens;
        }
      }
      
      if (currentChunk.trim().length > 30) {
        chunks.push(currentChunk.trim());
      }
      
      // ENHANCED: Split very large chunks further if needed
      const finalChunks = [];
      for (const chunk of chunks) {
        if (chunk.length > 1500) { // If chunk is too large, split by paragraphs or sentences
          const subChunks = chunk.split(/\.\s+/).filter(s => s.length > 20);
          let tempChunk = '';
          for (const subChunk of subChunks) {
            if (tempChunk.length + subChunk.length > 1200) {
              if (tempChunk.trim()) finalChunks.push(tempChunk.trim());
              tempChunk = subChunk;
            } else {
              tempChunk += (tempChunk ? '. ' : '') + subChunk;
            }
          }
          if (tempChunk.trim()) finalChunks.push(tempChunk.trim());
        } else {
          finalChunks.push(chunk);
        }
      }
      
      return finalChunks.filter(chunk => chunk.length > 20);
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
          const fallbackChunks = [{
            source_id: page.parent_source_id,
            chunk_index: 0,
            content: fallbackContent,
            token_count: Math.ceil(fallbackContent.length / 4),
            metadata: {
              url: page.url,
              page_id: page.id,
              content_hash: await generateContentHash(fallbackContent),
              extraction_method: 'title_fallback',
              page_title: title,
              processed_at: new Date().toISOString(),
              original_content_length: textContent.length,
              reprocessed: forceReprocess
            }
          }];

          const { error: insertError } = await supabase
            .from('source_chunks')
            .upsert(fallbackChunks, {
              onConflict: 'source_id,chunk_index',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error('❌ Error inserting fallback chunks:', insertError);
            
            await supabase
              .from('source_pages')
              .update({ 
                processing_status: 'failed',
                error_message: `Failed to insert chunks: ${insertError.message}`,
                completed_at: new Date().toISOString()
              })
              .eq('id', pageId);

            return new Response(
              JSON.stringify({
                success: false,
                error: `Failed to insert chunks: ${insertError.message}`,
                pageId
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          }

          // FIXED: Mark page as processed (not completed)
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
        } catch (error) {
          console.error('❌ Unexpected error inserting fallback chunks:', error);
          
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'failed',
              error_message: `Unexpected error inserting chunks: ${error.message}`,
              completed_at: new Date().toISOString()
            })
            .eq('id', pageId);

          return new Response(
            JSON.stringify({
              success: false,
              error: `Unexpected error inserting chunks: ${error.message}`,
              pageId
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
        
        // Generate embeddings with error handling
        try {
          await supabase.functions.invoke('generate-embeddings', {
            body: { sourceId: page.parent_source_id }
          });
        } catch (error) {
          console.warn('⚠️ Could not trigger embedding generation:', error);
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              chunksCreated: 1,
              message: 'Processed with title fallback',
              pageId,
              reprocessed: forceReprocess
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

    // Create semantic chunks from the content
    const chunks = createSemanticChunks(textContent);
    console.log(`📝 Created ${chunks.length} semantic chunks`);

    // Generate content hash
    let contentHash;
    try {
      contentHash = await generateContentHash(textContent);
    } catch (error) {
      console.error('❌ Failed to generate content hash:', error);
      contentHash = 'hash-generation-failed';
    }

    // Store chunks in database with better metadata
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: page.parent_source_id,
        chunk_index: index,
        content: chunk,
        token_count: Math.ceil(chunk.length / 4),
        metadata: {
          url: page.url,
          page_id: page.id, // IMPORTANT: Ensure this is set for proper filtering
          content_hash: contentHash,
          extraction_method: 'semantic_chunking',
          page_title: extractTitle(htmlContent),
          processed_at: new Date().toISOString(),
          original_content_length: textContent.length,
          reprocessed: forceReprocess,
          chunk_size: chunk.length,
          total_chunks: chunks.length
        }
      }));

      try {
        const { error: insertError } = await supabase
          .from('source_chunks')
          .upsert(chunksToInsert, {
            onConflict: 'source_id,chunk_index',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error('❌ Error inserting chunks:', insertError);
          
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'failed',
              error_message: `Failed to insert chunks: ${insertError.message}`,
              completed_at: new Date().toISOString()
            })
            .eq('id', pageId);

          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to insert chunks: ${insertError.message}`,
              pageId
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }

        // FIXED: Mark page as processed (not completed) with detailed metrics
        await supabase
          .from('source_pages')
          .update({ 
            processing_status: 'processed',
            chunks_created: chunks.length,
            content_size: contentSize,
            completed_at: new Date().toISOString(),
            processing_time_ms: Date.now() - new Date(page.started_at || page.created_at).getTime(),
            compression_ratio: contentSize > 0 ? textContent.length / contentSize : 1.0
          })
          .eq('id', pageId);
          
        console.log(`✅ Page ${pageId} marked as processed with ${chunks.length} chunks`);

        console.log(`✅ Stored ${chunks.length} chunks for parent source ${page.parent_source_id}`);
      } catch (error) {
        console.error('❌ Unexpected error inserting chunks:', error);
        
        await supabase
          .from('source_pages')
          .update({ 
            processing_status: 'failed',
            error_message: `Unexpected error inserting chunks: ${error.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', pageId);

        return new Response(
          JSON.stringify({
            success: false,
            error: `Unexpected error inserting chunks: ${error.message}`,
            pageId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // Generate embeddings for new chunks with error handling
    if (chunks.length > 0) {
      try {
        console.log(`🤖 Generating embeddings for source ${page.parent_source_id}`);
        await supabase.functions.invoke('generate-embeddings', {
          body: { sourceId: page.parent_source_id }
        });
        console.log('✅ Embedding generation completed');
      } catch (error) {
        console.warn('⚠️ Could not trigger embedding generation:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          chunksCreated: chunks.length,
          message: forceReprocess ? 'Content reprocessed successfully' : 'Content processed successfully',
          pageId,
          reprocessed: forceReprocess,
          contentSize,
          originalContentLength: textContent.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
