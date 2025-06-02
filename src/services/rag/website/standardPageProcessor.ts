
import { supabase } from "@/integrations/supabase/client";
import { ContentExtractionService } from "../contentExtractionService";
import { SemanticChunkingService } from "../semanticChunkingService";
import { DeduplicationService } from "../deduplicationService";
import { PerformanceMetricsService } from "../performanceMetricsService";
import { SourceChunkService } from "../sourceChunkService";
import { ProcessingResult } from "./types";

export class StandardPageProcessor {
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
          duplicatesFound: deduplicationResult.duplicateChunks.length,
          processingMode: 'standard',
          compressionMethod: 'standard',
          spaceSaved: compressionResult.originalSize - compressionResult.compressedSize
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
}
