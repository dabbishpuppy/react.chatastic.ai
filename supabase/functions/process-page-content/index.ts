
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
    const { pageId } = await req.json();

    if (!pageId) {
      throw new Error('pageId is required');
    }

    console.log(`🔄 Processing content for page: ${pageId}`);

    // Get the page details
    const { data: page, error: pageError } = await supabase
      .from('source_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      throw new Error(`Page not found: ${pageError?.message}`);
    }

    console.log(`📄 Processing page: ${page.url}`);

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
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Attempt ${attempts} failed for ${page.url}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to fetch after ${maxAttempts} attempts: ${error.message}`);
        }
        console.log(`Attempt ${attempts} failed for ${page.url}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status}: ${response?.statusText}`);
    }

    const htmlContent = await response.text();
    
    // Simple content extraction (similar to what's in child-job-processor)
    const extractTextContent = (html) => {
      // Remove script and style elements
      let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
      text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
      
      // Remove HTML tags
      text = text.replace(/<[^>]*>/g, ' ');
      
      // Clean up whitespace
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

    // Handle minimal content
    if (contentSize < 10) {
      const title = extractTitle(htmlContent);
      if (title && title.length > 0) {
        const fallbackContent = `Page: ${title}`;
        
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

        // Insert chunks
        const { error: insertError } = await supabase
          .from('source_chunks')
          .insert(fallbackChunks);

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }
        
        // Generate embeddings
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
            chunksCreated: 1,
            message: 'Processed with title fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error(`No meaningful content found for ${page.url}`);
      }
    }

    // Create semantic chunks from the content
    const chunks = createSemanticChunks(textContent);
    console.log(`📝 Created ${chunks.length} semantic chunks`);

    // Generate content hash
    const contentHash = await generateContentHash(textContent);

    // Store chunks in database - Link to parent source
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

      const { error: insertError } = await supabase
        .from('source_chunks')
        .insert(chunksToInsert);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }

      console.log(`✅ Stored ${chunks.length} chunks for parent source ${page.parent_source_id}`);
    }

    // Generate embeddings for new chunks
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
        chunksCreated: chunks.length,
        message: 'Content processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Content processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
