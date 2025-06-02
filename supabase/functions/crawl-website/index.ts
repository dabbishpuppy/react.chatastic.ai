import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

interface CrawlRequest {
  source_id: string;
  url: string;
  crawl_type: 'crawl-links' | 'sitemap' | 'individual-link';
  max_pages?: number;
  max_depth?: number;
  concurrency?: number;
  include_paths?: string[];
  exclude_paths?: string[];
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

// Enhanced logging function
const logCrawlEvent = async (level: 'info' | 'error' | 'debug', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, data };
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  
  // Store critical logs in database for debugging
  if (level === 'error' || level === 'info') {
    try {
      await supabase.from('crawl_performance_metrics').insert({
        phase: 'logging',
        start_time: timestamp,
        metadata: logEntry,
        team_id: data?.team_id || null,
        agent_id: data?.agent_id || null,
        source_id: data?.source_id || null
      });
    } catch (err) {
      console.error('Failed to store log entry:', err);
    }
  }
};

// Helper function to ensure JSON response
const jsonResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status
    }
  );
};

// Update source status with logging
const updateSourceStatus = async (sourceId: string, status: string, progress?: number, linksCount?: number, errorMessage?: string) => {
  const timestamp = new Date().toISOString();
  
  await logCrawlEvent('info', `Status transition for source ${sourceId}`, {
    sourceId,
    status,
    progress,
    linksCount,
    errorMessage,
    timestamp
  });

  const updateData: any = {
    crawl_status: status,
    last_crawled_at: timestamp,
    is_active: true // Ensure source remains visible
  };

  if (progress !== undefined) updateData.progress = progress;
  if (linksCount !== undefined) updateData.links_count = linksCount;
  if (errorMessage) updateData.metadata = { error_message: errorMessage, last_error_at: timestamp };

  const { error } = await supabase
    .from('agent_sources')
    .update(updateData)
    .eq('id', sourceId);

  if (error) {
    await logCrawlEvent('error', `Failed to update source status`, { sourceId, status, error });
    throw error;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody: CrawlRequest;
    
    try {
      requestBody = await req.json();
    } catch (parseError) {
      await logCrawlEvent('error', 'Failed to parse request body', { parseError });
      return jsonResponse({ 
        error: 'Invalid JSON in request body',
        success: false 
      }, 400);
    }

    const { 
      source_id, 
      url, 
      crawl_type, 
      max_pages = 100, 
      max_depth = 3, 
      concurrency = 2, 
      include_paths = [],
      exclude_paths = [],
      enable_content_pipeline = false 
    } = requestBody;
    
    await logCrawlEvent('info', 'Crawl request received', {
      source_id,
      url,
      crawl_type,
      max_pages,
      max_depth,
      concurrency,
      include_paths,
      exclude_paths,
      enable_content_pipeline
    });

    if (!source_id || !url) {
      await logCrawlEvent('error', 'Missing required fields', { source_id, url });
      return jsonResponse({
        error: 'Missing required fields: source_id and url',
        success: false
      }, 400);
    }

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
      await logCrawlEvent('error', 'Source not found', { source_id, sourceError });
      return jsonResponse({
        error: `Source not found: ${sourceError?.message || 'Unknown error'}`,
        success: false
      }, 404);
    }

    const agentId = source.agents.id;
    const teamId = source.agents.team_id;

    await logCrawlEvent('info', 'Source validated, starting crawl', {
      source_id,
      agentId,
      teamId
    });

    // Update source status to in_progress immediately
    await updateSourceStatus(source_id, 'in_progress', 0, 0);

    if (crawl_type === 'individual-link') {
      await processSinglePage(source_id, agentId, teamId, url, enable_content_pipeline);
    } else {
      await processMultiplePages(source_id, agentId, teamId, url, {
        maxPages: max_pages,
        maxDepth: max_depth,
        concurrency: concurrency,
        includePaths: include_paths,
        excludePaths: exclude_paths,
        enableContentPipeline: enable_content_pipeline
      });
    }

    await logCrawlEvent('info', 'Crawl completed successfully', {
      source_id,
      url,
      crawl_type
    });

    return jsonResponse({ 
      success: true, 
      message: `Crawl completed for ${url}`,
      contentPipelineEnabled: enable_content_pipeline
    });

  } catch (error) {
    await logCrawlEvent('error', 'Crawl error', { error: error.message, stack: error.stack });
    
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false 
    }, 500);
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
    await logCrawlEvent('info', 'Processing single page', { sourceId, url });
    
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
      await processWithContentPipeline(sourceId, agentId, teamId, url, htmlContent);
    } else {
      await processBasicContent(sourceId, url, htmlContent);
    }

    // Update source status to completed
    await updateSourceStatus(sourceId, 'completed', 100, 1);

    await logCrawlEvent('info', 'Single page processing completed', { sourceId, url });

  } catch (error) {
    await logCrawlEvent('error', 'Single page processing failed', { 
      sourceId, 
      url, 
      error: error.message 
    });
    
    await updateSourceStatus(sourceId, 'failed', 0, 0, error.message);
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
    const extractedContent = await extractMainContent(htmlContent, url);
    const compressedContent = await compressText(extractedContent.content);
    const summary = generateSummary(extractedContent.content);
    const keywords = extractKeywords(extractedContent.content);
    
    // Calculate actual content size (compressed size for storage efficiency)
    const actualContentSize = compressedContent.compressedSize;
    const compressionRatio = compressedContent.ratio < 1 ? compressedContent.ratio : null; // Only store meaningful compression ratios
    
    await supabase
      .from('agent_sources')
      .update({
        title: extractedContent.title,
        content: cleanContentForChunking(extractedContent.content),
        raw_text: compressedContent.compressed.join(','),
        content_summary: summary,
        keywords: keywords,
        extraction_method: 'readability',
        compression_ratio: compressionRatio,
        original_size: compressedContent.originalSize,
        compressed_size: actualContentSize,
        metadata: {
          file_size: actualContentSize,
          compressed_size: actualContentSize,
          compression_ratio: compressionRatio,
          content_type: 'text/html'
        }
      })
      .eq('id', sourceId);

    // Also update source_pages with compressed size
    await supabase
      .from('source_pages')
      .update({
        content_size: actualContentSize,
        compression_ratio: compressionRatio
      })
      .eq('id', sourceId);

    const chunks = createSemanticChunks(cleanContentForChunking(extractedContent.content));
    
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: sourceId,
        chunk_index: index,
        content: chunk.content,
        token_count: chunk.tokenCount,
        metadata: chunk.metadata
      }));

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
  const textContent = htmlContent
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Calculate compressed content size for more accurate size reporting
  const compressed = await compressText(textContent);
  const actualContentSize = compressed.compressedSize;
  const compressionRatio = compressed.ratio < 1 ? compressed.ratio : null; // Only store meaningful compression ratios

  await supabase
    .from('agent_sources')
    .update({
      title: url,
      content: textContent.substring(0, 10000),
      original_size: compressed.originalSize,
      compressed_size: actualContentSize,
      metadata: {
        file_size: actualContentSize,
        compressed_size: actualContentSize,
        compression_ratio: compressionRatio,
        content_type: 'text/html'
      }
    })
    .eq('id', sourceId);

  // Also update source_pages with compressed size
  await supabase
    .from('source_pages')
    .update({
      content_size: actualContentSize,
      compression_ratio: compressionRatio
    })
    .eq('id', sourceId);
}

// Helper functions for content processing
async function extractMainContent(html: string, url: string) {
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
  const originalSize = new TextEncoder().encode(text).length;
  const compressed = new TextEncoder().encode(text);
  
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
  const targetChunkSize = 500;
  const estimatedTokens = Math.ceil(content.length / 4);
  
  if (estimatedTokens <= targetChunkSize) {
    return [{
      content: content,
      tokenCount: estimatedTokens,
      chunkIndex: 0,
      metadata: {
        startPosition: 0,
        endPosition: content.length,
        sentences: content.split(/[.!?]+/).length,
        semanticBoundary: true
      }
    }];
  }

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
        chunkIndex: chunks.length,
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
      chunkIndex: chunks.length,
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

async function processMultiplePages(
  sourceId: string,
  agentId: string, 
  teamId: string,
  initialUrl: string,
  options: {
    maxPages: number;
    maxDepth: number;
    concurrency: number;
    includePaths: string[];
    excludePaths: string[];
    enableContentPipeline: boolean;
  }
) {
  try {
    await logCrawlEvent('info', 'Starting multiple pages processing', {
      sourceId,
      initialUrl,
      options
    });
    
    const discoveredUrls = await discoverUrls(initialUrl, options.maxDepth, options.maxPages);
    await logCrawlEvent('info', 'URLs discovered', { 
      sourceId, 
      discoveredCount: discoveredUrls.length 
    });
    
    const filteredUrls = filterUrlsByPaths(discoveredUrls, options.includePaths, options.excludePaths);
    await logCrawlEvent('info', 'URLs filtered', { 
      sourceId, 
      filteredCount: filteredUrls.length,
      originalCount: discoveredUrls.length
    });
    
    const totalPages = Math.min(filteredUrls.length, options.maxPages);
    let processedCount = 0;
    let totalCompressedSize = 0;
    const batchSize = options.concurrency;

    // Process URLs in batches
    for (let i = 0; i < totalPages; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);
      
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
              crawl_status: 'in_progress',
              is_active: true
            })
            .select('id')
            .single();

          if (childSource) {
            // Also create source_pages entry for tracking
            const { data: sourcePage } = await supabase
              .from('source_pages')
              .insert({
                id: childSource.id,
                parent_source_id: sourceId,
                customer_id: teamId,
                url: url,
                status: 'in_progress'
              })
              .select('id')
              .single();

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

              // Get the compressed size for tracking
              const { data: updatedSource } = await supabase
                .from('agent_sources')
                .select('compressed_size')
                .eq('id', childSource.id)
                .single();

              if (updatedSource?.compressed_size) {
                totalCompressedSize += updatedSource.compressed_size;
              }

              await updateSourceStatus(childSource.id, 'completed');
              
              // Update source_pages status
              await supabase
                .from('source_pages')
                .update({ status: 'completed' })
                .eq('id', childSource.id);
            } else {
              await updateSourceStatus(childSource.id, 'failed', 0, 0, `HTTP ${response.status}`);
              
              // Update source_pages status
              await supabase
                .from('source_pages')
                .update({ 
                  status: 'failed',
                  error_message: `HTTP ${response.status}`
                })
                .eq('id', childSource.id);
            }
          }
          
          processedCount++;
          
          // Update parent source progress and total compressed size
          const progress = Math.round((processedCount / totalPages) * 100);
          const avgCompressionRatio = totalCompressedSize > 0 ? totalCompressedSize / (processedCount * 10000) : null; // Rough estimate
          
          await supabase
            .from('agent_sources')
            .update({
              crawl_status: 'in_progress',
              progress: progress,
              links_count: processedCount,
              metadata: {
                total_content_size: totalCompressedSize,
                compression_ratio: avgCompressionRatio,
                last_progress_update: new Date().toISOString()
              }
            })
            .eq('id', sourceId);

        } catch (error) {
          await logCrawlEvent('error', 'Error processing URL in batch', { 
            sourceId, 
            url, 
            error: error.message 
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    // Calculate final compression ratio
    const finalCompressionRatio = totalCompressedSize > 0 && processedCount > 0 ? 
      totalCompressedSize / (processedCount * 15000) : null; // More realistic estimate based on average page size

    // Update final status with total compressed size and meaningful compression ratio
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'completed',
        progress: 100,
        links_count: processedCount,
        metadata: {
          total_content_size: totalCompressedSize,
          compression_ratio: finalCompressionRatio,
          last_progress_update: new Date().toISOString(),
          compression_summary: `Processed ${processedCount} pages with total compressed size of ${Math.round(totalCompressedSize / 1024)} KB`
        }
      })
      .eq('id', sourceId);

    await logCrawlEvent('info', 'Multiple pages processing completed', {
      sourceId,
      totalProcessed: processedCount,
      totalPages,
      totalCompressedSize
    });

  } catch (error) {
    await logCrawlEvent('error', 'Multiple pages processing failed', { 
      sourceId, 
      initialUrl, 
      error: error.message 
    });
    
    await updateSourceStatus(sourceId, 'failed', 0, 0, error.message);
    throw error;
  }
}

// remaining helper functions
function filterUrlsByPaths(urls: string[], includePaths: string[], excludePaths: string[]): string[] {
  return urls.filter(url => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      if (includePaths.length > 0) {
        const matchesInclude = includePaths.some(pattern => {
          const regexPattern = pattern.replace(/\*/g, '.*');
          const regex = new RegExp(`^${regexPattern}`, 'i');
          return regex.test(path);
        });
        
        if (!matchesInclude) {
          return false;
        }
      }
      
      if (excludePaths.length > 0) {
        const matchesExclude = excludePaths.some(pattern => {
          const regexPattern = pattern.replace(/\*/g, '.*');
          const regex = new RegExp(`^${regexPattern}`, 'i');
          return regex.test(path);
        });
        
        if (matchesExclude) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error filtering URL ${url}:`, error);
      return false;
    }
  });
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
