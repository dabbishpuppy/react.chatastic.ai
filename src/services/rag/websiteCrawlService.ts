import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";
import { ContentExtractionService } from "./contentExtractionService";
import { SemanticChunkingService } from "./semanticChunkingService";
import { DeduplicationService } from "./deduplicationService";
import { PerformanceMetricsService } from "./performanceMetricsService";
import { SourceChunkService } from "./sourceChunkService";
import { AdvancedCompressionEngine } from "./enhanced/advancedCompressionEngine";

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePaths?: string;
  excludePaths?: string;
  respectRobots?: boolean;
  concurrency?: number;
  enableAdvancedCompression?: boolean;
}

interface ProcessingResult {
  success: boolean;
  error?: string;
  metrics?: {
    extractionTime: number;
    cleaningTime: number;
    chunkingTime: number;
    compressionRatio: number;
    chunksCreated: number;
    duplicatesFound: number;
    processingMode: string;
    compressionMethod: string;
    spaceSaved: number;
  };
}

export class WebsiteCrawlService {
  // Enhanced crawling function with advanced compression
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    console.log('🚀 Starting enhanced crawl with advanced compression pipeline');
    
    // Get team_id for metrics
    const { data: agent } = await supabase
      .from('agents')
      .select('team_id')
      .eq('id', agentId)
      .single();
    
    const teamId = agent?.team_id;
    if (!teamId) {
      throw new Error('Could not determine team ID for agent');
    }

    try {
      // Update the source metadata with advanced compression settings
      await this.updateSourceCrawlMetadata(sourceId, {
        ...options,
        enableAdvancedCompression: true
      });

      // Call the edge function with advanced compression enabled
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          source_id: sourceId,
          url: initialUrl,
          crawl_type: options.maxDepth === 0 ? 'individual-link' : 'crawl-links',
          max_pages: options.maxPages,
          max_depth: options.maxDepth,
          concurrency: options.concurrency,
          enable_content_pipeline: true,
          enable_advanced_compression: true // New flag for advanced compression
        }
      });

      if (error) {
        console.error('Error calling crawl function:', error);
        throw error;
      }

      console.log('Advanced crawl function response:', data);
    } catch (error) {
      console.error('Failed to start advanced crawl:', error);
      
      // Update source status to failed
      await this.updateSourceStatus(sourceId, 'failed', 0);
      throw error;
    }
  }

  // Enhanced page processing with advanced compression
  static async processPageContentAdvanced(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ): Promise<ProcessingResult> {
    let extractionMetricId = '';
    let cleaningMetricId = '';
    let chunkingMetricId = '';
    
    try {
      console.log(`📄 Processing page with advanced compression: ${url}`);
      
      // Phase 1: Enhanced Content Analysis and Extraction
      extractionMetricId = await PerformanceMetricsService.startMetric({
        sourceId,
        agentId,
        teamId,
        phase: 'extraction',
        inputSize: htmlContent.length
      });

      const extractionStart = Date.now();
      
      // Use advanced content cleaning
      const cleanedHtml = AdvancedCompressionEngine.enhancedContentCleaning(htmlContent);
      
      // Analyze content for smart processing mode selection
      const contentAnalysis = AdvancedCompressionEngine.analyzeContent(cleanedHtml);
      const processingMode = AdvancedCompressionEngine.selectProcessingMode(contentAnalysis, cleanedHtml.length);
      
      console.log(`📊 Content analysis: ${contentAnalysis.contentType}, density: ${contentAnalysis.density.toFixed(2)}, mode: ${processingMode}`);
      
      // Extract title
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
      
      const extractionTime = Date.now() - extractionStart;

      // Phase 2: Advanced Compression
      const compressionStart = Date.now();
      const compressionResult = await AdvancedCompressionEngine.compressWithMaximumEfficiency(cleanedHtml);
      const compressionTime = Date.now() - compressionStart;
      
      console.log(`🗜️ Advanced compression: ${compressionResult.originalSize} → ${compressionResult.compressedSize} bytes (${compressionResult.savings}% saved, method: ${compressionResult.method})`);
      
      // Generate summary and keywords
      const { summary, keywords } = await this.generateContentSummary(cleanedHtml);

      // Convert compressed data to string for storage
      const compressedDataString = Array.from(compressionResult.compressed).join(',');

      await PerformanceMetricsService.endMetric(extractionMetricId, agentId, 'extraction', {
        outputSize: compressionResult.compressedSize,
        itemsProcessed: 1,
        successRate: 1.0,
        metadata: {
          compressionRatio: compressionResult.ratio,
          originalSize: compressionResult.originalSize,
          compressionMethod: compressionResult.method,
          contentType: contentAnalysis.contentType,
          processingMode,
          title
        }
      });

      // Phase 3: Smart Processing Based on Mode
      cleaningMetricId = await PerformanceMetricsService.startMetric({
        sourceId,
        agentId,
        teamId,
        phase: 'processing',
        inputSize: cleanedHtml.length
      });

      let chunksCreated = 0;
      let duplicatesFound = 0;
      const processingStart = Date.now();

      if (processingMode === 'summary') {
        // Use summary mode - no chunking needed
        await supabase
          .from('agent_sources')
          .update({
            title,
            raw_text: compressedDataString,
            content_summary: summary,
            keywords: keywords,
            extraction_method: 'advanced_summary',
            compression_ratio: compressionResult.ratio,
            original_size: compressionResult.originalSize,
            compressed_size: compressionResult.compressedSize,
            metadata: {
              processing_mode: processingMode,
              compression_method: compressionResult.method,
              content_analysis: contentAnalysis,
              file_size: compressionResult.compressedSize
            }
          })
          .eq('id', sourceId);
          
        console.log(`✅ Summary mode processing complete for ${url}`);
        
      } else {
        // Use chunking mode with advanced deduplication
        const chunks = SemanticChunkingService.createSemanticChunks(cleanedHtml);
        
        // Advanced deduplication
        const deduplicationResult = await AdvancedCompressionEngine.performAdvancedDeduplication(
          chunks.map(c => c.content),
          agentId
        );
        
        duplicatesFound = deduplicationResult.duplicatesRemoved + deduplicationResult.sentenceDeduplication;
        
        // Create chunks from deduplicated content
        if (deduplicationResult.uniqueChunks.length > 0) {
          const chunksForInsert = deduplicationResult.uniqueChunks.map((content, index) => ({
            source_id: sourceId,
            chunk_index: index,
            content: content,
            token_count: Math.ceil(content.length / 4), // Estimate token count
            metadata: {
              processing_mode: processingMode,
              compression_method: compressionResult.method,
              deduplication_applied: true
            }
          }));

          const createdChunks = await SourceChunkService.createChunks(chunksForInsert);
          chunksCreated = createdChunks.length;
        }

        // Update source with content and compression info
        await supabase
          .from('agent_sources')
          .update({
            title,
            content: cleanedHtml,
            raw_text: compressedDataString,
            content_summary: summary,
            keywords: keywords,
            extraction_method: 'advanced_chunking',
            compression_ratio: compressionResult.ratio,
            original_size: compressionResult.originalSize,
            compressed_size: compressionResult.compressedSize,
            unique_chunks: chunksCreated,
            duplicate_chunks: duplicatesFound,
            metadata: {
              processing_mode: processingMode,
              compression_method: compressionResult.method,
              content_analysis: contentAnalysis,
              file_size: compressionResult.compressedSize,
              advanced_deduplication: true
            }
          })
          .eq('id', sourceId);
          
        console.log(`✅ Advanced chunking complete: ${chunksCreated} chunks, ${duplicatesFound} duplicates removed`);
      }

      const processingTime = Date.now() - processingStart;

      await PerformanceMetricsService.endMetric(cleaningMetricId, agentId, 'processing', {
        outputSize: compressionResult.compressedSize,
        itemsProcessed: chunksCreated || 1,
        successRate: 1.0,
        metadata: {
          processingMode,
          chunksCreated,
          duplicatesFound,
          compressionMethod: compressionResult.method,
          spaceSaved: compressionResult.originalSize - compressionResult.compressedSize
        }
      });

      return {
        success: true,
        metrics: {
          extractionTime,
          cleaningTime: compressionTime,
          chunkingTime: processingTime,
          compressionRatio: compressionResult.ratio,
          chunksCreated,
          duplicatesFound,
          processingMode,
          compressionMethod: compressionResult.method,
          spaceSaved: compressionResult.savings
        }
      };

    } catch (error) {
      console.error('Error in advanced page processing:', error);

      // End any active metrics with error
      if (extractionMetricId) {
        await PerformanceMetricsService.endMetric(extractionMetricId, agentId, 'extraction', {
          successRate: 0.0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      if (cleaningMetricId) {
        await PerformanceMetricsService.endMetric(cleaningMetricId, agentId, 'processing', {
          successRate: 0.0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Generate enhanced content summary
  private static async generateContentSummary(content: string): Promise<{
    summary: string;
    keywords: string[];
  }> {
    // Extract meaningful sentences for summary
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 3);
    
    let summary = sentences.join('. ');
    if (summary.length > 200) {
      summary = summary.substring(0, 200 - 3) + '...';
    }
    
    // Enhanced keyword extraction with TF-IDF-like scoring
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq: Record<string, number> = {};
    const totalWords = words.length;
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Calculate TF-IDF-like scores (simplified)
    const wordScores = Object.entries(wordFreq).map(([word, freq]) => {
      const tf = freq / totalWords;
      const score = tf * Math.log(totalWords / freq); // Simple TF-IDF approximation
      return { word, score };
    });

    const keywords = wordScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.word);

    return { summary, keywords };
  }

  // Process a single page through the complete content pipeline
  static async processPageContent(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ): Promise<ProcessingResult> {
    let extractionMetricId = '';
    let cleaningMetricId = '';
    let chunkingMetricId = '';
    
    try {
      // Phase 1: Content Extraction & Archival
      extractionMetricId = await PerformanceMetricsService.startMetric({
        sourceId,
        agentId,
        teamId,
        phase: 'extraction',
        inputSize: htmlContent.length
      });

      const extractionStart = Date.now();
      const extractedContent = await ContentExtractionService.extractContent(htmlContent, url);
      const extractionTime = Date.now() - extractionStart;

      // Compress the extracted content for archival
      const compressionResult = await ContentExtractionService.compressText(extractedContent.content);
      
      // Generate summary and keywords
      const { summary, keywords } = await ContentExtractionService.generateContentSummary(
        extractedContent.content
      );

      // Convert compressed data to string for storage
      const compressedDataString = Array.from(compressionResult.compressed).join(',');

      // Update the source with archived content and metadata
      await supabase
        .from('agent_sources')
        .update({
          raw_text: compressedDataString, // Store as string representation
          content_summary: summary,
          keywords: keywords,
          extraction_method: 'readability',
          compression_ratio: compressionResult.ratio,
          original_size: compressionResult.originalSize,
          compressed_size: compressionResult.compressedSize,
          title: extractedContent.title
        })
        .eq('id', sourceId);

      await PerformanceMetricsService.endMetric(extractionMetricId, agentId, 'extraction', {
        outputSize: compressionResult.compressedSize,
        itemsProcessed: 1,
        successRate: 1.0,
        metadata: {
          compressionRatio: compressionResult.ratio,
          originalSize: compressionResult.originalSize,
          title: extractedContent.title
        }
      });

      // Phase 2: Content Cleaning
      cleaningMetricId = await PerformanceMetricsService.startMetric({
        sourceId,
        agentId,
        teamId,
        phase: 'cleaning',
        inputSize: extractedContent.content.length
      });

      const cleaningStart = Date.now();
      const cleanedContent = ContentExtractionService.cleanContentForChunking(extractedContent.content);
      const cleaningTime = Date.now() - cleaningStart;

      // Store cleaned content for chunking
      await supabase
        .from('agent_sources')
        .update({
          content: cleanedContent
        })
        .eq('id', sourceId);

      await PerformanceMetricsService.endMetric(cleaningMetricId, agentId, 'cleaning', {
        outputSize: cleanedContent.length,
        itemsProcessed: 1,
        successRate: 1.0
      });

      // Phase 3: Semantic Chunking
      chunkingMetricId = await PerformanceMetricsService.startMetric({
        sourceId,
        agentId,
        teamId,
        phase: 'chunking',
        inputSize: cleanedContent.length
      });

      const chunkingStart = Date.now();
      const semanticChunks = SemanticChunkingService.createSemanticChunks(cleanedContent);
      const chunkingTime = Date.now() - chunkingStart;

      // Phase 4: Deduplication
      const deduplicationStart = Date.now();
      const chunksForInsert = semanticChunks.map(chunk => ({
        source_id: sourceId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        token_count: chunk.tokenCount,
        metadata: chunk.metadata
      }));

      const deduplicationResult = await DeduplicationService.processChunksForDeduplication(
        chunksForInsert,
        agentId
      );

      // Insert only unique chunks
      let createdChunks = [];
      if (deduplicationResult.uniqueChunks.length > 0) {
        createdChunks = await SourceChunkService.createChunks(deduplicationResult.uniqueChunks);
      }

      const deduplicationTime = Date.now() - deduplicationStart;

      await PerformanceMetricsService.endMetric(chunkingMetricId, agentId, 'chunking', {
        outputSize: deduplicationResult.uniqueChunks.reduce((sum, chunk) => sum + chunk.content.length, 0),
        itemsProcessed: createdChunks.length,
        successRate: 1.0,
        metadata: {
          totalChunks: semanticChunks.length,
          uniqueChunks: deduplicationResult.uniqueChunks.length,
          duplicatesFound: deduplicationResult.duplicateChunks.length,
          deduplicationRate: deduplicationResult.stats.deduplicationRate
        }
      });

      // Record deduplication metrics
      await PerformanceMetricsService.recordMetric({
        sourceId,
        agentId,
        teamId,
        phase: 'deduplication',
        durationMs: deduplicationTime,
        inputSize: semanticChunks.length,
        outputSize: deduplicationResult.uniqueChunks.length,
        itemsProcessed: deduplicationResult.duplicateChunks.length,
        successRate: 1.0,
        metadata: deduplicationResult.stats
      });

      return {
        success: true,
        metrics: {
          extractionTime,
          cleaningTime,
          chunkingTime,
          compressionRatio: compressionResult.ratio,
          chunksCreated: createdChunks.length,
          duplicatesFound: deduplicationResult.duplicateChunks.length
        }
      };

    } catch (error) {
      console.error('Error processing page content:', error);

      // End any active metrics with error
      if (extractionMetricId) {
        await PerformanceMetricsService.endMetric(extractionMetricId, agentId, 'extraction', {
          successRate: 0.0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      if (cleaningMetricId) {
        await PerformanceMetricsService.endMetric(cleaningMetricId, agentId, 'cleaning', {
          successRate: 0.0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      if (chunkingMetricId) {
        await PerformanceMetricsService.endMetric(chunkingMetricId, agentId, 'chunking', {
          successRate: 0.0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Update source metadata with crawl parameters
  private static async updateSourceCrawlMetadata(
    sourceId: string,
    options: CrawlOptions & { enableAdvancedCompression?: boolean }
  ): Promise<void> {
    const { data: currentSource, error: fetchError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (fetchError) throw fetchError;

    // Safely handle metadata by ensuring it's always an object
    const existingMetadata = currentSource.metadata as Record<string, any> || {};
    
    const updatedMetadata = {
      ...existingMetadata,
      max_pages: options.maxPages || 100,
      max_depth: options.maxDepth || 3,
      concurrency: options.concurrency || 2,
      last_progress_update: new Date().toISOString(),
      content_pipeline_enabled: true,
      advanced_compression_enabled: options.enableAdvancedCompression || false
    };

    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: updatedMetadata,
        crawl_status: 'pending',
        progress: 0,
        links_count: 0
      })
      .eq('id', sourceId);

    if (error) throw error;
  }

  // Update source crawl status and progress
  private static async updateSourceStatus(
    sourceId: string,
    status: string,
    progress: number
  ): Promise<void> {
    const { error } = await supabase
      .from('agent_sources')
      .update({
        crawl_status: status,
        progress
      })
      .eq('id', sourceId);

    if (error) throw error;
  }
}
