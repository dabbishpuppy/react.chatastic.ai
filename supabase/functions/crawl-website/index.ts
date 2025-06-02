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
  enable_advanced_compression?: boolean;
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
      enable_content_pipeline = false,
      enable_advanced_compression = false
    } = requestBody;
    
    await logCrawlEvent('info', 'Advanced crawl request received', {
      source_id,
      url,
      crawl_type,
      max_pages,
      max_depth,
      concurrency,
      include_paths,
      exclude_paths,
      enable_content_pipeline,
      enable_advanced_compression
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

    await updateSourceStatus(source_id, 'in_progress', 0, 0);

    if (crawl_type === 'individual-link') {
      await processSinglePageAdvanced(source_id, agentId, teamId, url, enable_advanced_compression);
    } else {
      await processMultiplePagesAdvanced(source_id, agentId, teamId, url, {
        maxPages: max_pages,
        maxDepth: max_depth,
        concurrency: concurrency,
        includePaths: include_paths,
        excludePaths: exclude_paths,
        enableAdvancedCompression: enable_advanced_compression
      });
    }

    await logCrawlEvent('info', 'Advanced crawl completed successfully', {
      source_id,
      url,
      crawl_type,
      advanced_compression: enable_advanced_compression
    });

    return jsonResponse({ 
      success: true, 
      message: `Advanced crawl completed for ${url}`,
      advancedCompressionEnabled: enable_advanced_compression
    });

  } catch (error) {
    await logCrawlEvent('error', 'Advanced crawl error', { error: error.message, stack: error.stack });
    
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false 
    }, 500);
  }
});

// Enhanced single page processing with advanced compression
async function processSinglePageAdvanced(
  sourceId: string, 
  agentId: string, 
  teamId: string, 
  url: string, 
  enableAdvancedCompression: boolean
) {
  try {
    await logCrawlEvent('info', 'Processing single page with advanced compression', { sourceId, url, enableAdvancedCompression });
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WonderwaveBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const htmlContent = await response.text();

    if (enableAdvancedCompression) {
      await processWithAdvancedCompression(sourceId, agentId, teamId, url, htmlContent);
    } else {
      await processWithContentPipeline(sourceId, agentId, teamId, url, htmlContent);
    }

    await updateSourceStatus(sourceId, 'completed', 100, 1);
    await logCrawlEvent('info', 'Advanced single page processing completed', { sourceId, url });

  } catch (error) {
    await logCrawlEvent('error', 'Advanced single page processing failed', { 
      sourceId, 
      url, 
      error: error.message 
    });
    
    await updateSourceStatus(sourceId, 'failed', 0, 0, error.message);
    throw error;
  }
}

// Advanced compression processing
async function processWithAdvancedCompression(
  sourceId: string,
  agentId: string,
  teamId: string,
  url: string,
  htmlContent: string
) {
  try {
    console.log(`🚀 Processing with advanced compression: ${url}`);
    
    // Enhanced content cleaning with aggressive boilerplate removal
    const cleanedContent = enhancedContentCleaning(htmlContent);
    
    // Content analysis for smart processing
    const contentAnalysis = analyzeContent(cleanedContent);
    const processingMode = selectProcessingMode(contentAnalysis, cleanedContent.length);
    
    console.log(`📊 Content analysis - type: ${contentAnalysis.contentType}, density: ${contentAnalysis.density.toFixed(2)}, mode: ${processingMode}`);
    
    // Advanced compression with maximum efficiency
    const compressionResult = await compressWithMaximumEfficiency(cleanedContent);
    
    console.log(`🗜️ Advanced compression: ${compressionResult.originalSize} → ${compressionResult.compressedSize} bytes (${compressionResult.savings}% saved)`);
    
    const extractedContent = await extractMainContent(htmlContent, url);
    const summary = generateSummary(cleanedContent);
    const keywords = extractKeywords(cleanedContent);
    
    // Store with advanced compression metadata
    await supabase
      .from('agent_sources')
      .update({
        title: extractedContent.title,
        content: processingMode === 'summary' ? summary : cleanedContent.substring(0, 10000),
        raw_text: Array.from(compressionResult.compressed).join(','),
        content_summary: summary,
        keywords: keywords,
        extraction_method: `advanced_${processingMode}`,
        compression_ratio: compressionResult.ratio,
        original_size: compressionResult.originalSize,
        compressed_size: compressionResult.compressedSize,
        metadata: {
          file_size: compressionResult.compressedSize,
          compression_method: compressionResult.method,
          processing_mode: processingMode,
          content_analysis: contentAnalysis,
          space_saved: compressionResult.originalSize - compressionResult.compressedSize,
          compression_savings_percent: compressionResult.savings
        }
      })
      .eq('id', sourceId);

    // Also update source_pages with advanced compression data
    await supabase
      .from('source_pages')
      .update({
        content_size: compressionResult.compressedSize,
        compression_ratio: compressionResult.ratio
      })
      .eq('id', sourceId);

    // Create optimized chunks only if using chunking mode
    if (processingMode === 'chunking') {
      const chunks = createOptimizedChunks(cleanedContent);
      
      if (chunks.length > 0) {
        const chunksToInsert = chunks.map((chunk, index) => ({
          source_id: sourceId,
          chunk_index: index,
          content: chunk.content,
          token_count: chunk.tokenCount,
          metadata: {
            ...chunk.metadata,
            processing_mode: processingMode,
            compression_method: compressionResult.method
          }
        }));

        await supabase
          .from('source_chunks')
          .insert(chunksToInsert);
      }
    }

    console.log(`✅ Advanced compression processing complete for ${url}`);

  } catch (error) {
    console.error('Error in advanced compression processing:', error);
    throw error;
  }
}

// Enhanced content cleaning with aggressive optimizations
function enhancedContentCleaning(htmlContent: string): string {
  let cleaned = htmlContent;
  
  // Basic cleaning (existing)
  cleaned = cleaned
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Enhanced aggressive cleaning
  cleaned = cleaned
    // Remove cookie notices and GDPR banners
    .replace(/<div[^>]*class="[^"]*cookie[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*gdpr[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    
    // Remove social media widgets
    .replace(/<div[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<iframe[^>]*src="[^"]*facebook[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi, '')
    
    // Remove ads and promotional content
    .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*promo[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    
    // Remove breadcrumbs and pagination
    .replace(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<div[^>]*class="[^"]*pagination[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '');
  
  // Convert to plain text
  const textContent = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Advanced text cleaning
  return advancedTextCleaning(textContent);
}

// Advanced text cleaning with CTA removal and stop word filtering
function advancedTextCleaning(text: string): string {
  let cleaned = text;
  
  // Remove common CTAs and promotional phrases
  const ctaPatterns = [
    /\b(click here|read more|learn more|find out more|get started|sign up|subscribe|buy now|shop now)\b/gi,
    /\b(follow us|like us|share this|back to top|next page|previous page)\b/gi,
    /\b(terms and conditions|privacy policy|cookie policy|disclaimer)\b/gi
  ];
  
  ctaPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Normalize whitespace and punctuation
  cleaned = cleaned
    .replace(/[.]{3,}/g, '...')
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

// Content analysis for smart processing mode selection
function analyzeContent(text: string): any {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const uniqueWords = new Set(words).size;
  const wordDensity = uniqueWords / words.length;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const phrases: Record<string, number> = {};
  
  sentences.forEach(sentence => {
    const normalized = sentence.trim().toLowerCase();
    if (normalized.length > 20) {
      phrases[normalized] = (phrases[normalized] || 0) + 1;
    }
  });
  
  const repeatedPhrases = Object.entries(phrases).filter(([, count]) => count > 1);
  const boilerplateRatio = repeatedPhrases.length / sentences.length;
  
  let contentType = 'mixed';
  if (boilerplateRatio > 0.4) contentType = 'template';
  else if (wordDensity > 0.6 && uniqueWords > 100) contentType = 'content-rich';
  else if (words.length < 200 || wordDensity < 0.3) contentType = 'informational';
  
  return {
    contentType,
    density: wordDensity,
    uniqueWords,
    repeatedPhrases: repeatedPhrases.map(([phrase]) => phrase),
    boilerplateRatio
  };
}

// Smart processing mode selection
function selectProcessingMode(analysis: any, pageSize: number): string {
  if (analysis.contentType === 'informational' || pageSize < 1000) {
    return 'summary';
  }
  
  if (analysis.contentType === 'template' || analysis.boilerplateRatio > 0.5) {
    return 'template-removal';
  }
  
  return 'chunking';
}

// Maximum efficiency compression
async function compressWithMaximumEfficiency(text: string): Promise<any> {
  const originalData = new TextEncoder().encode(text);
  const originalSize = originalData.length;
  
  try {
    let compressed: Uint8Array;
    let method = 'enhanced-gzip';
    
    // Use CompressionStream with maximum efficiency if available
    if ('CompressionStream' in window || globalThis.CompressionStream) {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(originalData);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      compressed = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }
    } else {
      // Fallback to enhanced RLE compression
      compressed = enhancedRLECompression(originalData);
      method = 'enhanced-rle';
    }
    
    const compressedSize = compressed.length;
    const ratio = compressedSize / originalSize;
    const savings = Math.round((1 - ratio) * 100);
    
    return {
      compressed,
      originalSize,
      compressedSize,
      ratio,
      method,
      savings
    };
    
  } catch (error) {
    console.error('Compression failed:', error);
    return {
      compressed: originalData,
      originalSize,
      compressedSize: originalData.length,
      ratio: 1.0,
      method: 'none',
      savings: 0
    };
  }
}

// Enhanced RLE compression with better efficiency
function enhancedRLECompression(data: Uint8Array): Uint8Array {
  const compressed: number[] = [];
  let i = 0;
  
  while (i < data.length) {
    const current = data[i];
    let count = 1;
    
    // Count consecutive identical bytes
    while (i + count < data.length && data[i + count] === current && count < 255) {
      count++;
    }
    
    // Use RLE for runs of 2 or more (more aggressive)
    if (count > 1) {
      compressed.push(255, count, current); // 255 is escape byte
    } else {
      compressed.push(current);
    }
    
    i += count;
  }
  
  return new Uint8Array(compressed);
}

// Create optimized chunks with better boundaries
function createOptimizedChunks(content: string): any[] {
  const targetChunkSize = 400; // Smaller chunks for better compression
  const estimatedTokens = Math.ceil(content.length / 4);
  
  if (estimatedTokens <= targetChunkSize) {
    return [{
      content: content,
      tokenCount: estimatedTokens,
      chunkIndex: 0,
      metadata: {
        startPosition: 0,
        endPosition: content.length,
        optimized: true
      }
    }];
  }

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);
    
    if (currentTokens + sentenceTokens > targetChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
        chunkIndex: chunks.length,
        metadata: {
          startPosition: 0,
          endPosition: currentChunk.length,
          optimized: true,
          sentenceBoundary: true
        }
      });
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '. ' + sentence;
      } else {
        currentChunk = sentence;
      }
      currentTokens += sentenceTokens;
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
        optimized: true,
        sentenceBoundary: true
      }
    });
  }

  return chunks;
}

// ... keep existing code (other helper functions)

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
    
    const actualContentSize = compressedContent.compressedSize;
    const compressionRatio = compressedContent.ratio < 1 ? compressedContent.ratio : null;
    
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

async function processMultiplePagesAdvanced(
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
    enableAdvancedCompression: boolean;
  }
) {
  try {
    await logCrawlEvent('info', 'Starting advanced multiple pages processing', {
      sourceId,
      initialUrl,
      options
    });
    
    const discoveredUrls = await discoverUrls(initialUrl, options.maxDepth, options.maxPages);
    const filteredUrls = filterUrlsByPaths(discoveredUrls, options.includePaths, options.excludePaths);
    
    const totalPages = Math.min(filteredUrls.length, options.maxPages);
    let processedCount = 0;
    let totalCompressedSize = 0;
    let totalOriginalSize = 0;
    const batchSize = options.concurrency;

    for (let i = 0; i < totalPages; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
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
            await supabase
              .from('source_pages')
              .insert({
                id: childSource.id,
                parent_source_id: sourceId,
                customer_id: teamId,
                url: url,
                status: 'in_progress'
              });

            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WonderwaveBot/1.0)',
              },
            });

            if (response.ok) {
              const htmlContent = await response.text();
              
              if (options.enableAdvancedCompression) {
                await processWithAdvancedCompression(childSource.id, agentId, teamId, url, htmlContent);
              } else {
                await processWithContentPipeline(childSource.id, agentId, teamId, url, htmlContent);
              }

              const { data: updatedSource } = await supabase
                .from('agent_sources')
                .select('compressed_size, original_size')
                .eq('id', childSource.id)
                .single();

              if (updatedSource?.compressed_size) {
                totalCompressedSize += updatedSource.compressed_size;
              }
              if (updatedSource?.original_size) {
                totalOriginalSize += updatedSource.original_size;
              }

              await updateSourceStatus(childSource.id, 'completed');
              
              await supabase
                .from('source_pages')
                .update({ status: 'completed' })
                .eq('id', childSource.id);
            } else {
              await updateSourceStatus(childSource.id, 'failed', 0, 0, `HTTP ${response.status}`);
              
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
          
          const progress = Math.round((processedCount / totalPages) * 100);
          const avgCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : null;
          
          await supabase
            .from('agent_sources')
            .update({
              crawl_status: 'in_progress',
              progress: progress,
              links_count: processedCount,
              original_size: totalOriginalSize,
              compressed_size: totalCompressedSize,
              compression_ratio: avgCompressionRatio,
              metadata: {
                total_content_size: totalCompressedSize,
                compression_ratio: avgCompressionRatio,
                advanced_compression_enabled: options.enableAdvancedCompression,
                last_progress_update: new Date().toISOString()
              }
            })
            .eq('id', sourceId);

        } catch (error) {
          await logCrawlEvent('error', 'Error processing URL in advanced batch', { 
            sourceId, 
            url, 
            error: error.message 
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    const finalCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : null;
    const spaceSaved = totalOriginalSize - totalCompressedSize;
    const savingsPercent = totalOriginalSize > 0 ? Math.round((spaceSaved / totalOriginalSize) * 100) : 0;

    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'completed',
        progress: 100,
        links_count: processedCount,
        original_size: totalOriginalSize,
        compressed_size: totalCompressedSize,
        compression_ratio: finalCompressionRatio,
        metadata: {
          total_content_size: totalCompressedSize,
          compression_ratio: finalCompressionRatio,
          advanced_compression_enabled: options.enableAdvancedCompression,
          space_saved: spaceSaved,
          compression_savings_percent: savingsPercent,
          last_progress_update: new Date().toISOString()
        }
      })
      .eq('id', sourceId);

    await logCrawlEvent('info', 'Advanced multiple pages processing completed', {
      sourceId,
      totalProcessed: processedCount,
      totalPages,
      totalCompressedSize,
      totalOriginalSize,
      savingsPercent,
      advancedCompression: options.enableAdvancedCompression
    });

  } catch (error) {
    await logCrawlEvent('error', 'Advanced multiple pages processing failed', { 
      sourceId, 
      initialUrl, 
      error: error.message 
    });
    
    await updateSourceStatus(sourceId, 'failed', 0, 0, error.message);
    throw error;
  }
}

// ... keep existing code (helper functions like extractMainContent, compressText, generateSummary, etc.)

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
