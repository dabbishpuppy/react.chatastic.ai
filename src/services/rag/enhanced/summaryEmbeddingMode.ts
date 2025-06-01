
import { supabase } from "@/integrations/supabase/client";
import { AdvancedChunkPruningService } from "./advancedChunkPruning";
import { CompressionEngine } from "./compressionEngine";

export interface SummaryModeOptions {
  enabled: boolean;
  maxSummaryLength: number;
  generateEmbeddings: boolean;
  customerTier: 'basic' | 'pro' | 'enterprise';
}

export interface ProcessedSummary {
  sourceId: string;
  url: string;
  title?: string;
  summary: string;
  keyTopics: string[];
  contentHash: string;
  originalSize: number;
  summarySize: number;
  compressionRatio: number;
  embedding?: number[];
}

export class SummaryEmbeddingModeService {
  // Process page in summary/embedding mode for lightweight customers
  static async processPageSummaryMode(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string,
    options: SummaryModeOptions
  ): Promise<ProcessedSummary> {
    console.log(`📄 Processing page in summary mode: ${url}`);
    
    // Step 1: Extract and clean content
    const cleanContent = this.extractMainContent(htmlContent);
    const originalSize = cleanContent.length;
    
    if (cleanContent.length < 100) {
      throw new Error('Content too short for summary processing');
    }
    
    // Step 2: Create initial chunks for analysis
    const initialChunks = this.createSemanticChunks(cleanContent, 200);
    
    // Step 3: Use advanced pruning to get best 2-3 chunks
    const prunedChunks = await AdvancedChunkPruningService.pruneChunksAdvanced(
      initialChunks,
      3, // Max 3 chunks for summary
      true // Enable summary mode
    );
    
    // Step 4: Generate page summary from best chunks
    const summary = this.generatePageSummary(
      prunedChunks.map(c => c.summaryText || c.content),
      options.maxSummaryLength
    );
    
    // Step 5: Extract key topics from TF-IDF analysis
    const keyTopics = this.extractKeyTopics(prunedChunks);
    
    // Step 6: Calculate content hash and compression ratio
    const contentHash = await CompressionEngine.generateContentHash(summary);
    const summarySize = summary.length;
    const compressionRatio = summarySize / originalSize;
    
    // Step 7: Generate embedding if requested
    let embedding: number[] | undefined;
    if (options.generateEmbeddings) {
      embedding = await this.generateEmbedding(summary);
    }
    
    // Step 8: Store in optimized format
    await this.storeSummaryRecord(sourceId, customerId, {
      url,
      summary,
      keyTopics,
      contentHash,
      originalSize,
      summarySize,
      compressionRatio,
      embedding
    });
    
    console.log(`✅ Summary mode processing complete: ${originalSize} → ${summarySize} bytes (${(compressionRatio * 100).toFixed(1)}% ratio)`);
    
    return {
      sourceId,
      url,
      summary,
      keyTopics,
      contentHash,
      originalSize,
      summarySize,
      compressionRatio,
      embedding
    };
  }

  // Extract main content (reuse from content processing pipeline)
  private static extractMainContent(html: string): string {
    // Remove script, style, and navigation elements
    let content = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
      .replace(/<header[^>]*>.*?<\/header>/gi, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>.*?<\/aside>/gi, '');

    // Convert to plain text and clean up
    return content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Create semantic chunks (simplified version)
  private static createSemanticChunks(content: string, maxTokens: number = 200): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const chunks: string[] = [];
    let currentChunk = '';
    let tokenCount = 0;

    for (const sentence of sentences) {
      const sentenceTokens = Math.ceil(sentence.trim().length / 4);
      
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
  }

  // Generate comprehensive page summary
  private static generatePageSummary(chunkSummaries: string[], maxLength: number): string {
    // Combine and deduplicate key information
    const combinedContent = chunkSummaries.join(' ');
    
    // Extract key sentences
    const sentences = combinedContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = [...new Set(sentences.map(s => s.trim().toLowerCase()))]
      .map(s => sentences.find(orig => orig.trim().toLowerCase() === s))
      .filter(Boolean) as string[];
    
    // Score and select best sentences
    const scoredSentences = uniqueSentences.map((sentence, index) => {
      const positionScore = Math.max(1, 5 - index); // Earlier sentences preferred
      const lengthScore = Math.min(sentence.length / 80, 2); // Optimal length around 80 chars
      const keywordScore = this.scoreKeywords(sentence);
      
      return {
        sentence: sentence.trim(),
        score: positionScore + lengthScore + keywordScore,
        length: sentence.length
      };
    });
    
    // Build summary within length limit
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    for (const { sentence, length } of scoredSentences) {
      if (currentLength + length + 2 <= maxLength) {
        summary += (summary ? '. ' : '') + sentence;
        currentLength += length + (summary ? 2 : 0);
      }
    }
    
    return summary || combinedContent.substring(0, maxLength - 3) + '...';
  }

  // Score sentences for keyword relevance
  private static scoreKeywords(sentence: string): number {
    const keywordPatterns = [
      /\b(about|company|business|service|product)\b/i,
      /\b(offer|provide|deliver|solution|help)\b/i,
      /\b(experience|expert|professional|quality)\b/i,
      /\b(contact|location|address|phone|email)\b/i,
      /\b(features|benefits|advantages|technology)\b/i
    ];
    
    return keywordPatterns.reduce((score, pattern) => {
      return score + (pattern.test(sentence) ? 1 : 0);
    }, 0);
  }

  // Extract key topics from pruned chunks
  private static extractKeyTopics(prunedChunks: any[]): string[] {
    const allTopics = new Set<string>();
    
    prunedChunks.forEach(chunk => {
      if (chunk.topTerms) {
        chunk.topTerms.forEach((term: string) => allTopics.add(term));
      }
    });
    
    // Return top 5 most relevant topics
    return Array.from(allTopics).slice(0, 5);
  }

  // Generate embedding for summary (placeholder - would use actual embedding service)
  private static async generateEmbedding(text: string): Promise<number[]> {
    // In production, this would call OpenAI's embedding API or similar
    // For now, return a mock embedding
    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
    console.log(`🔗 Generated embedding for summary (${text.length} chars)`);
    return mockEmbedding;
  }

  // Store summary record optimized for quick retrieval
  private static async storeSummaryRecord(
    sourceId: string,
    customerId: string,
    data: Omit<ProcessedSummary, 'sourceId'>
  ): Promise<void> {
    // Store summary in agent_sources with optimized metadata
    const { error } = await supabase
      .from('agent_sources')
      .update({
        content: data.summary,
        metadata: {
          processing_mode: 'summary_embedding',
          key_topics: data.keyTopics,
          content_hash: data.contentHash,
          original_size: data.originalSize,
          summary_size: data.summarySize,
          compression_ratio: data.compressionRatio,
          has_embedding: !!data.embedding,
          processed_at: new Date().toISOString()
        },
        original_size: data.originalSize,
        compressed_size: data.summarySize,
        compression_ratio: data.compressionRatio
      })
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to store summary record: ${error.message}`);
    }

    // Store embedding separately if generated
    if (data.embedding) {
      await supabase
        .from('source_embeddings')
        .insert({
          chunk_id: sourceId, // Use source ID directly for summaries
          embedding: JSON.stringify(data.embedding),
          model_name: 'summary-embedding-v1'
        });
    }
  }

  // Get processing mode recommendations based on customer tier and content size
  static getProcessingModeRecommendation(
    customerTier: 'basic' | 'pro' | 'enterprise',
    contentSize: number,
    pageCount: number
  ): {
    mode: 'full' | 'summary' | 'hybrid';
    summaryOptions: SummaryModeOptions;
  } {
    // Basic tier: Always use summary mode for efficiency
    if (customerTier === 'basic') {
      return {
        mode: 'summary',
        summaryOptions: {
          enabled: true,
          maxSummaryLength: 150,
          generateEmbeddings: false,
          customerTier
        }
      };
    }
    
    // Pro tier: Use summary for large crawls, full for small ones
    if (customerTier === 'pro') {
      const useSummary = pageCount > 50 || contentSize > 1024 * 1024; // 1MB
      return {
        mode: useSummary ? 'summary' : 'full',
        summaryOptions: {
          enabled: useSummary,
          maxSummaryLength: 200,
          generateEmbeddings: true,
          customerTier
        }
      };
    }
    
    // Enterprise: Use hybrid approach or full processing
    return {
      mode: pageCount > 200 ? 'hybrid' : 'full',
      summaryOptions: {
        enabled: false,
        maxSummaryLength: 300,
        generateEmbeddings: true,
        customerTier
      }
    };
  }
}
