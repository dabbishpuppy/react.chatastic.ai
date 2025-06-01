
import { ContentProcessingPipeline } from "./contentProcessingPipeline";
import { AdvancedChunkPruningService } from "./advancedChunkPruning";
import { SummaryEmbeddingModeService, SummaryModeOptions } from "./summaryEmbeddingMode";
import { ProductionRateLimiting } from "./productionRateLimiting";

export interface EnhancedProcessingOptions {
  enableAdvancedPruning: boolean;
  maxChunksPerPage: number;
  summaryMode: SummaryModeOptions;
  customerTier: 'basic' | 'pro' | 'enterprise';
}

export interface EnhancedProcessingResult {
  success: boolean;
  processingMode: 'full' | 'summary' | 'hybrid';
  contentSize: number;
  compressionRatio: number;
  chunksCreated: number;
  duplicatesFound: number;
  summaryGenerated?: boolean;
  embeddingCreated?: boolean;
  contentHash: string;
  error?: string;
}

export class EnhancedContentProcessor {
  // Main processing entry point with mode selection
  static async processPageEnhanced(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string,
    options?: Partial<EnhancedProcessingOptions>
  ): Promise<EnhancedProcessingResult> {
    
    // Get customer tier and determine optimal processing mode
    const customerTier = await this.getCustomerTier(customerId);
    const contentSize = htmlContent.length;
    
    const processingOptions: EnhancedProcessingOptions = {
      enableAdvancedPruning: options?.enableAdvancedPruning ?? true,
      maxChunksPerPage: options?.maxChunksPerPage ?? (customerTier === 'basic' ? 3 : 5),
      summaryMode: options?.summaryMode ?? {
        enabled: false,
        maxSummaryLength: 200,
        generateEmbeddings: true,
        customerTier
      },
      customerTier
    };

    // Determine processing mode based on customer tier and content
    const modeRecommendation = SummaryEmbeddingModeService.getProcessingModeRecommendation(
      customerTier,
      contentSize,
      1 // Single page processing
    );

    console.log(`🎯 Processing mode: ${modeRecommendation.mode} for ${customerTier} tier customer`);

    try {
      switch (modeRecommendation.mode) {
        case 'summary':
          return await this.processSummaryMode(sourceId, customerId, url, htmlContent, modeRecommendation.summaryOptions);
        
        case 'full':
          return await this.processFullMode(sourceId, customerId, url, htmlContent, processingOptions);
        
        case 'hybrid':
          return await this.processHybridMode(sourceId, customerId, url, htmlContent, processingOptions);
        
        default:
          throw new Error(`Unknown processing mode: ${modeRecommendation.mode}`);
      }
    } catch (error) {
      console.error('Enhanced processing failed:', error);
      return {
        success: false,
        processingMode: modeRecommendation.mode,
        contentSize,
        compressionRatio: 1.0,
        chunksCreated: 0,
        duplicatesFound: 0,
        contentHash: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Summary mode processing
  private static async processSummaryMode(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string,
    summaryOptions: SummaryModeOptions
  ): Promise<EnhancedProcessingResult> {
    
    const result = await SummaryEmbeddingModeService.processPageSummaryMode(
      sourceId,
      customerId,
      url,
      htmlContent,
      summaryOptions
    );

    return {
      success: true,
      processingMode: 'summary',
      contentSize: result.originalSize,
      compressionRatio: result.compressionRatio,
      chunksCreated: 1, // Summary counts as one chunk
      duplicatesFound: 0,
      summaryGenerated: true,
      embeddingCreated: !!result.embedding,
      contentHash: result.contentHash
    };
  }

  // Full mode processing with advanced pruning
  private static async processFullMode(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string,
    options: EnhancedProcessingOptions
  ): Promise<EnhancedProcessingResult> {
    
    // Extract and clean content
    const cleanContent = ContentProcessingPipeline.extractMainContent(htmlContent);
    const originalSize = cleanContent.length;

    if (cleanContent.length < 100) {
      throw new Error('Content too short after cleaning');
    }

    // Create initial semantic chunks
    const initialChunks = ContentProcessingPipeline.createSemanticChunks(cleanContent);
    
    let finalChunks: string[];
    
    if (options.enableAdvancedPruning) {
      // Use advanced pruning with TF-IDF
      const prunedChunks = await AdvancedChunkPruningService.pruneChunksAdvanced(
        initialChunks,
        options.maxChunksPerPage,
        false // No summary mode in full processing
      );
      finalChunks = prunedChunks.map(chunk => chunk.content);
    } else {
      // Use basic pruning
      const prunedChunks = AdvancedChunkPruningService.pruneChunks(initialChunks, options.maxChunksPerPage);
      finalChunks = prunedChunks.filter(chunk => chunk.isHighValue).map(chunk => chunk.content);
    }

    // Process with compression and global deduplication
    const dedupeResult = await ContentProcessingPipeline.processChunksWithDeduplication(
      finalChunks.map((content, index) => ({
        content,
        tokenCount: Math.ceil(content.length / 4),
        chunkIndex: index
      })),
      sourceId,
      customerId
    );

    // Calculate content hash
    const contentHash = await ContentProcessingPipeline.calculateContentHash(cleanContent);
    const compressionRatio = dedupeResult.totalCompressedSize > 0 
      ? dedupeResult.totalCompressedSize / originalSize 
      : 0;

    return {
      success: true,
      processingMode: 'full',
      contentSize: originalSize,
      compressionRatio,
      chunksCreated: dedupeResult.uniqueChunks,
      duplicatesFound: dedupeResult.duplicateChunks,
      summaryGenerated: false,
      embeddingCreated: false,
      contentHash
    };
  }

  // Hybrid mode: Full processing for key pages, summary for others
  private static async processHybridMode(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string,
    options: EnhancedProcessingOptions
  ): Promise<EnhancedProcessingResult> {
    
    // Determine if this is a "key page" based on URL patterns
    const isKeyPage = this.isKeyPage(url);
    
    if (isKeyPage) {
      console.log(`🔑 Processing as key page: ${url}`);
      return await this.processFullMode(sourceId, customerId, url, htmlContent, options);
    } else {
      console.log(`📄 Processing as summary page: ${url}`);
      const summaryOptions: SummaryModeOptions = {
        enabled: true,
        maxSummaryLength: 250, // Slightly longer for hybrid mode
        generateEmbeddings: true,
        customerTier: options.customerTier
      };
      return await this.processSummaryMode(sourceId, customerId, url, htmlContent, summaryOptions);
    }
  }

  // Determine if a page is considered "key" for hybrid processing
  private static isKeyPage(url: string): boolean {
    const keyPagePatterns = [
      /\/(about|company|team|leadership)/i,
      /\/(services|products|solutions|offerings)/i,
      /\/(contact|location|office)/i,
      /\/(careers|jobs|hiring)/i,
      /\/(pricing|plans|packages)/i,
      /\/$/  // Home page
    ];
    
    return keyPagePatterns.some(pattern => pattern.test(url));
  }

  // Get customer tier from rate limiting service
  private static async getCustomerTier(customerId: string): Promise<'basic' | 'pro' | 'enterprise'> {
    try {
      const usage = await ProductionRateLimiting.getCustomerUsage(customerId);
      return usage.tier.name as 'basic' | 'pro' | 'enterprise';
    } catch (error) {
      console.warn('Failed to get customer tier, defaulting to basic:', error);
      return 'basic';
    }
  }

  // Get processing statistics for monitoring
  static async getProcessingStats(customerId: string, days: number = 7): Promise<{
    totalPagesProcessed: number;
    summaryPages: number;
    fullPages: number;
    averageCompressionRatio: number;
    totalSpaceSaved: number;
  }> {
    // This would query processing logs/metrics
    // For now, return mock data
    return {
      totalPagesProcessed: 150,
      summaryPages: 90,
      fullPages: 60,
      averageCompressionRatio: 0.35,
      totalSpaceSaved: 2.5 // GB
    };
  }
}
