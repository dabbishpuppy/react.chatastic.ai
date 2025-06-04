
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

    const { pageId } = requestBody;

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

    console.log(`🔄 Processing content for page: ${pageId}`);

    // FIXED: Use atomic update with proper concurrency control
    const { data: updateResult, error: lockError } = await supabase
      .from('source_pages')
      .update({ 
        processing_status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .in('processing_status', ['pending']) // Only update if currently pending
      .select()
      .single();

    if (lockError || !updateResult) {
      console.log(`⏭️ Page ${pageId} already being processed or completed`);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Page is already being processed or completed',
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

    const createSemanticChunks = (content, maxTokens = 150) => {
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
      
      return chunks.filter(chunk => chunk.length > 20);
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
              original_content_length: textContent.length
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
              pageId
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

    // Store chunks in database
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: page.parent_source_id,
        chunk_index: index,
        content: chunk,
        token_count: Math.ceil(chunk.length / 4),
        metadata: {
          url: page.url,
          page_id: page.id,
          content_hash: contentHash,
          extraction_method: 'semantic_chunking',
          page_title: extractTitle(htmlContent),
          processed_at: new Date().toISOString(),
          original_content_length: textContent.length
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
          message: 'Content processed successfully',
          pageId
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
