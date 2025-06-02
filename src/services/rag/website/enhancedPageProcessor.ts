
import { supabase } from "@/integrations/supabase/client";
import { SemanticChunkingService } from "../semanticChunkingService";
import { PerformanceMetricsService } from "../performanceMetricsService";
import { SourceChunkService } from "../sourceChunkService";
import { AdvancedCompressionEngine } from "../enhanced/advancedCompressionEngine";
import { ProcessingResult } from "./types";

export class EnhancedPageProcessor {
  static async processPageContentAdvanced(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ): Promise<ProcessingResult> {
    let extractionMetricId = '';
    let cleaningMetricId = '';
    
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

      // Convert ContentAnalysis to plain object for JSON storage
      const contentAnalysisPlain = {
        contentType: contentAnalysis.contentType,
        density: contentAnalysis.density,
        uniqueWords: contentAnalysis.uniqueWords,
        repeatedPhrases: contentAnalysis.repeatedPhrases,
        boilerplateRatio: contentAnalysis.boilerplateRatio
      };

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
        phase: 'cleaning',
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
              content_analysis: contentAnalysisPlain,
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
              content_analysis: contentAnalysisPlain,
              file_size: compressionResult.compressedSize,
              advanced_deduplication: true
            }
          })
          .eq('id', sourceId);
          
        console.log(`✅ Advanced chunking complete: ${chunksCreated} chunks, ${duplicatesFound} duplicates removed`);
      }

      const processingTime = Date.now() - processingStart;

      await PerformanceMetricsService.endMetric(cleaningMetricId, agentId, 'cleaning', {
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
        await PerformanceMetricsService.endMetric(cleaningMetricId, agentId, 'cleaning', {
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
}
