import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";
import { ContentExtractionService } from "./contentExtractionService";
import { SemanticChunkingService } from "./semanticChunkingService";
import { DeduplicationService } from "./deduplicationService";
import { PerformanceMetricsService } from "./performanceMetricsService";
import { SourceChunkService } from "./sourceChunkService";

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePaths?: string;
  excludePaths?: string;
  respectRobots?: boolean;
  concurrency?: number;
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
  };
}

export class WebsiteCrawlService {
  // Enhanced crawling function that processes content through the full pipeline
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    console.log('🚀 Starting enhanced crawl with full content pipeline');
    
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
      // Update the source metadata with the new crawl parameters before starting
      await this.updateSourceCrawlMetadata(sourceId, options);

      // Call the edge function to handle the crawling
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          source_id: sourceId,
          url: initialUrl,
          crawl_type: options.maxDepth === 0 ? 'individual-link' : 'crawl-links',
          max_pages: options.maxPages,
          max_depth: options.maxDepth,
          concurrency: options.concurrency,
          enable_content_pipeline: true // Enable new processing pipeline
        }
      });

      if (error) {
        console.error('Error calling crawl function:', error);
        throw error;
      }

      console.log('Crawl function response:', data);
    } catch (error) {
      console.error('Failed to start crawl:', error);
      
      // Update source status to failed
      await this.updateSourceStatus(sourceId, 'failed', 0);
      throw error;
    }
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

      // Update the source with archived content and metadata
      await supabase
        .from('agent_sources')
        .update({
          raw_text: Array.from(compressionResult.compressed), // Store as number array for BYTEA
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
    options: CrawlOptions
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
      content_pipeline_enabled: true
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
