
import { supabase } from "@/integrations/supabase/client";
import { CompressionService } from "../enhanced/services/compression/compressionService";

export class EnhancedPageProcessor {
  // Enhanced page processing with maximum compression and proper chunking
  static async processPageContentAdvanced(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ) {
    console.log(`🚀 Starting enhanced page processing for: ${url}`);
    console.log(`📊 Original content size: ${htmlContent.length} bytes`);
    
    try {
      const startTime = Date.now();
      
      // Phase 1: Maximum efficiency content cleaning
      const cleanedContent = this.cleanContentForCompression(htmlContent);
      console.log(`🧹 Cleaned content: ${htmlContent.length} → ${cleanedContent.length} bytes`);
      
      // Phase 2: Maximum efficiency compression using CompressionService
      const compressionResult = await CompressionService.compressWithMaximumEfficiency(cleanedContent);
      console.log(`🗜️ Compression result:`, {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        ratio: compressionResult.ratio,
        savings: compressionResult.savings,
        method: compressionResult.method
      });
      
      // Phase 3: Generate content hash for deduplication
      const contentHash = await this.generateContentHash(cleanedContent);
      
      // Phase 4: Create semantic chunks with maximum efficiency
      const chunks = this.createMaximumEfficiencyChunks(cleanedContent);
      console.log(`📝 Created ${chunks.length} semantic chunks`);
      
      // Phase 5: Store compressed content and chunks
      const processingTimeMs = Date.now() - startTime;
      
      // Update source page with compression results
      const { error: updateError } = await supabase
        .from('source_pages')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          content_size: compressionResult.originalSize,
          compression_ratio: compressionResult.ratio,
          chunks_created: chunks.length,
          processing_time_ms: processingTimeMs,
          metadata: {
            compression_method: compressionResult.method,
            compression_savings: compressionResult.savings,
            content_hash: contentHash,
            chunk_count: chunks.length,
            processing_mode: 'maximum_efficiency',
            target_compression: '10-15%'
          }
        })
        .eq('id', sourceId);

      if (updateError) {
        console.error('Failed to update source page:', updateError);
        throw updateError;
      }
      
      // Phase 6: Store chunks with deduplication
      let uniqueChunks = 0;
      let duplicateChunks = 0;
      
      for (const chunk of chunks) {
        const chunkHash = await this.generateContentHash(chunk.content);
        
        // Check for existing chunk
        const { data: existingChunk } = await supabase
          .from('source_chunks')
          .select('id')
          .eq('content_hash', chunkHash)
          .single();
        
        if (existingChunk) {
          duplicateChunks++;
          console.log(`♻️ Reused existing chunk: ${existingChunk.id}`);
        } else {
          // Compress chunk content
          const chunkCompressionResult = await CompressionService.compressWithMaximumEfficiency(chunk.content);
          
          const { error: chunkError } = await supabase
            .from('source_chunks')
            .insert({
              source_id: sourceId,
              agent_id: agentId,
              team_id: teamId,
              content: chunk.content,
              content_hash: chunkHash,
              token_count: Math.ceil(chunk.content.length / 4),
              chunk_index: chunk.index,
              metadata: {
                compression_method: 'maximum_efficiency',
                chunk_type: chunk.type,
                importance_score: chunk.importance,
                compressed_size: chunkCompressionResult.compressedSize,
                compression_ratio: chunkCompressionResult.ratio
              }
            });
          
          if (chunkError) {
            console.error('Failed to store chunk:', chunkError);
          } else {
            uniqueChunks++;
            console.log(`✅ Stored new chunk ${chunk.index} (${chunk.content.length} bytes)`);
          }
        }
      }
      
      console.log(`📊 Enhanced processing complete:`, {
        url,
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.ratio,
        compressionSavings: compressionResult.savings,
        uniqueChunks,
        duplicateChunks,
        totalChunks: chunks.length,
        processingTimeMs
      });
      
      return {
        success: true,
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.ratio,
        compressionSavings: compressionResult.savings,
        uniqueChunks,
        duplicateChunks,
        totalChunks: chunks.length,
        processingTimeMs,
        contentHash
      };
      
    } catch (error) {
      console.error('Enhanced page processing failed:', error);
      
      // Update status to failed
      await supabase
        .from('source_pages')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', sourceId);
      
      throw error;
    }
  }

  // Clean content for maximum compression efficiency
  private static cleanContentForCompression(htmlContent: string): string {
    let cleaned = htmlContent;

    // Remove all HTML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove script and style tags completely
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove navigation and footer elements
    cleaned = cleaned.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
    cleaned = cleaned.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
    cleaned = cleaned.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
    
    // Remove ads and promotional content
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*(?:ad|advertisement|promo|banner)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Convert to plain text and clean whitespace
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  // Generate content hash for deduplication
  private static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Create maximum efficiency semantic chunks
  private static createMaximumEfficiencyChunks(content: string) {
    const chunks = [];
    const maxChunkSize = 800; // Smaller chunks for better compression
    const overlapSize = 100;
    
    // Split content into paragraphs
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        // Finalize current chunk
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          type: 'semantic',
          importance: this.calculateImportanceScore(currentChunk)
        });
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlapSize / 5));
        currentChunk = overlapWords.join(' ') + ' ' + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        type: 'semantic',
        importance: this.calculateImportanceScore(currentChunk)
      });
    }
    
    return chunks;
  }
  
  // Calculate importance score for chunk prioritization
  private static calculateImportanceScore(content: string): number {
    let score = 0;
    
    // Length factor
    score += Math.min(content.length / 100, 5);
    
    // Keyword density
    const keywords = ['service', 'product', 'solution', 'technology', 'business', 'professional'];
    const keywordCount = keywords.reduce((count, keyword) => {
      return count + (content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    }, 0);
    score += keywordCount * 0.5;
    
    // Sentence structure
    const sentences = content.split(/[.!?]+/).length;
    score += Math.min(sentences / 5, 3);
    
    return Math.round(score * 10) / 10;
  }
}
