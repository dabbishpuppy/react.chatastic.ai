
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

interface CrawlRequest {
  source_id: string;
  url: string;
  crawl_type: 'crawl-links' | 'sitemap' | 'individual-link';
  max_pages?: number;
  max_depth?: number;
  concurrency?: number;
  enable_content_pipeline?: boolean;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_id, url, crawl_type, max_pages = 100, max_depth = 3, concurrency = 2, enable_content_pipeline = false }: CrawlRequest = await req.json();
    
    console.log(`Starting crawl for source ${source_id}, URL: ${url}, type: ${crawl_type}`);

    // Get source info and agent details
    const { data: source, error: sourceError } = await supabase
      .from('agent_sources')
      .select(`
        *,
        agents!inner(id, team_id)
      `)
      .eq('id', source_id)
      .single();

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`);
    }

    const agentId = source.agents.id;
    const teamId = source.agents.team_id;

    // Update source status to in_progress
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'in_progress',
        progress: 0,
        last_crawled_at: new Date().toISOString()
      })
      .eq('id', source_id);

    if (crawl_type === 'individual-link') {
      // Process single page with enhanced pipeline
      await processSinglePage(source_id, agentId, teamId, url, enable_content_pipeline);
    } else {
      // Process multiple pages with enhanced pipeline
      await processMultiplePages(source_id, agentId, teamId, url, {
        maxPages: max_pages,
        maxDepth: max_depth,
        concurrency,
        enableContentPipeline: enable_content_pipeline
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Crawl completed for ${url}`,
        contentPipelineEnabled: enable_content_pipeline
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Crawl error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

async function processSinglePage(
  sourceId: string, 
  agentId: string, 
  teamId: string, 
  url: string, 
  enableContentPipeline: boolean
) {
  try {
    console.log(`Processing single page: ${url}`);
    
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WonderwaveBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const htmlContent = await response.text();

    if (enableContentPipeline) {
      // Use the new enhanced content processing pipeline
      await processWithContentPipeline(sourceId, agentId, teamId, url, htmlContent);
    } else {
      // Fallback to basic content storage
      await processBasicContent(sourceId, url, htmlContent);
    }

    // Update source status to completed
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'completed',
        progress: 100,
        links_count: 1
      })
      .eq('id', sourceId);

  } catch (error) {
    console.error(`Error processing single page ${url}:`, error);
    
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'failed',
        progress: 0
      })
      .eq('id', sourceId);
    
    throw error;
  }
}

async function processMultiplePages(
  sourceId: string,
  agentId: string, 
  teamId: string,
  initialUrl: string,
  options: {
    maxPages: number;
    maxDepth: number;
    concurrency: number;
    enableContentPipeline: boolean;
  }
) {
  try {
    console.log(`Processing multiple pages starting from: ${initialUrl}`);
    
    const discoveredUrls = await discoverUrls(initialUrl, options.maxDepth, options.maxPages);
    const totalPages = Math.min(discoveredUrls.length, options.maxPages);
    
    console.log(`Found ${discoveredUrls.length} URLs, processing ${totalPages} pages`);

    let processedCount = 0;
    const batchSize = options.concurrency;

    // Process URLs in batches
    for (let i = 0; i < totalPages; i += batchSize) {
      const batch = discoveredUrls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          // Create child source for each URL
          const { data: childSource } = await supabase
            .from('agent_sources')
            .insert({
              agent_id: agentId,
              team_id: teamId,
              parent_source_id: sourceId,
              source_type: 'website',
              title: url,
              url: url,
              crawl_status: 'in_progress'
            })
            .select('id')
            .single();

          if (childSource) {
            // Fetch and process the page
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WonderwaveBot/1.0)',
              },
            });

            if (response.ok) {
              const htmlContent = await response.text();
              
              if (options.enableContentPipeline) {
                await processWithContentPipeline(childSource.id, agentId, teamId, url, htmlContent);
              } else {
                await processBasicContent(childSource.id, url, htmlContent);
              }

              await supabase
                .from('agent_sources')
                .update({ crawl_status: 'completed' })
                .eq('id', childSource.id);
            } else {
              await supabase
                .from('agent_sources')
                .update({ crawl_status: 'failed' })
                .eq('id', childSource.id);
            }
          }
          
          processedCount++;
          
          // Update parent source progress
          const progress = Math.round((processedCount / totalPages) * 100);
          await supabase
            .from('agent_sources')
            .update({
              progress,
              links_count: processedCount
            })
            .eq('id', sourceId);

        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
    }

    // Update final status
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'completed',
        progress: 100,
        links_count: processedCount
      })
      .eq('id', sourceId);

  } catch (error) {
    console.error('Error in processMultiplePages:', error);
    
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'failed',
        progress: 0
      })
      .eq('id', sourceId);
    
    throw error;
  }
}

async function processWithContentPipeline(
  sourceId: string,
  agentId: string,
  teamId: string,
  url: string,
  htmlContent: string
) {
  try {
    // Extract main content using readability-like algorithm
    const extractedContent = await extractMainContent(htmlContent, url);
    
    // Compress extracted content
    const compressedContent = await compressText(extractedContent.content);
    
    // Generate summary and keywords
    const summary = generateSummary(extractedContent.content);
    const keywords = extractKeywords(extractedContent.content);
    
    // Update source with compressed archived content
    await supabase
      .from('agent_sources')
      .update({
        title: extractedContent.title,
        content: cleanContentForChunking(extractedContent.content),
        raw_text: compressedContent.compressed.join(','), // Store as string
        content_summary: summary,
        keywords: keywords,
        extraction_method: 'readability',
        compression_ratio: compressedContent.ratio,
        original_size: compressedContent.originalSize,
        compressed_size: compressedContent.compressedSize
      })
      .eq('id', sourceId);

    // Create semantic chunks
    const chunks = createSemanticChunks(cleanContentForChunking(extractedContent.content));
    
    // Process chunks for deduplication and insert
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: sourceId,
        chunk_index: index,
        content: chunk.content,
        token_count: chunk.tokenCount,
        metadata: chunk.metadata
      }));

      // Insert chunks (deduplication will be handled by the trigger)
      await supabase
        .from('source_chunks')
        .insert(chunksToInsert);
    }

  } catch (error) {
    console.error('Error in content pipeline:', error);
    throw error;
  }
}

async function processBasicContent(sourceId: string, url: string, htmlContent: string) {
  // Basic text extraction for fallback
  const textContent = htmlContent
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  await supabase
    .from('agent_sources')
    .update({
      title: url,
      content: textContent.substring(0, 10000) // Limit basic content
    })
    .eq('id', sourceId);
}

// Helper functions for content processing
async function extractMainContent(html: string, url: string) {
  // Simple content extraction (production would use a proper readability library)
  const textContent = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
    .replace(/<header[^>]*>.*?<\/header>/gi, '')
    .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>.*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

  return {
    title,
    content: textContent,
    length: textContent.length
  };
}

function compressText(text: string) {
  // Simple compression simulation (production would use actual compression)
  const originalSize = new TextEncoder().encode(text).length;
  const compressed = new TextEncoder().encode(text); // Placeholder
  
  return {
    compressed: Array.from(compressed),
    originalSize,
    compressedSize: compressed.length,
    ratio: compressed.length / originalSize
  };
}

function generateSummary(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 3).join('. ').substring(0, 200) + '...';
}

function extractKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

function cleanContentForChunking(content: string): string {
  return content
    .replace(/\b(Advertisement|Sponsored|Ad)\b/gi, '')
    .replace(/\b(Click here|Read more|Learn more)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSemanticChunks(content: string) {
  const targetChunkSize = 500; // tokens
  const estimatedTokens = Math.ceil(content.length / 4);
  
  if (estimatedTokens <= targetChunkSize) {
    return [{
      content,
      tokenCount: estimatedTokens,
      metadata: {
        startPosition: 0,
        endPosition: content.length,
        sentences: content.split(/[.!?]+/).length,
        semanticBoundary: true
      }
    }];
  }

  // Split by paragraphs
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4);
    
    if (currentTokens + paragraphTokens > targetChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
        metadata: {
          startPosition: 0,
          endPosition: currentChunk.length,
          sentences: currentChunk.split(/[.!?]+/).length,
          semanticBoundary: true
        }
      });
      currentChunk = paragraph;
      currentTokens = paragraphTokens;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
      currentTokens += paragraphTokens;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: currentTokens,
      metadata: {
        startPosition: 0,
        endPosition: currentChunk.length,
        sentences: currentChunk.split(/[.!?]+/).length,
        semanticBoundary: true
      }
    });
  }

  return chunks;
}

async function discoverUrls(startUrl: string, maxDepth: number, maxPages: number): Promise<string[]> {
  const urls = new Set<string>([startUrl]);
  const visited = new Set<string>();
  const queue = [{ url: startUrl, depth: 0 }];

  while (queue.length > 0 && urls.size < maxPages) {
    const { url, depth } = queue.shift()!;
    
    if (visited.has(url) || depth >= maxDepth) {
      continue;
    }
    
    visited.add(url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WonderwaveBot/1.0)',
        },
      });
      
      if (!response.ok) {
        continue;
      }
      
      const html = await response.text();
      const linkMatches = html.match(/href="([^"]+)"/g) || [];
      
      const baseUrl = new URL(url);
      
      for (const linkMatch of linkMatches) {
        if (urls.size >= maxPages) break;
        
        const href = linkMatch.match(/href="([^"]+)"/)?.[1];
        if (!href) continue;
        
        try {
          const fullUrl = new URL(href, url).toString();
          const urlObj = new URL(fullUrl);
          
          // Only include URLs from the same domain
          if (urlObj.hostname === baseUrl.hostname && 
              !urls.has(fullUrl) && 
              !fullUrl.includes('#') &&
              !fullUrl.match(/\.(pdf|jpg|jpeg|png|gif|mp4|mp3|zip|doc|docx)$/i)) {
            urls.add(fullUrl);
            
            if (depth + 1 < maxDepth) {
              queue.push({ url: fullUrl, depth: depth + 1 });
            }
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
    }
  }

  return Array.from(urls);
}
