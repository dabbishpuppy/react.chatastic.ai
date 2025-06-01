
import { supabase } from "@/integrations/supabase/client";

export interface PageSummary {
  sourceId: string;
  url: string;
  title: string;
  summary: string;
  keywords: string[];
  embeddingVector: number[];
  originalSize: number;
  compressedSize: number;
  processingMode: 'summary';
}

export interface SummaryModeConfig {
  maxSummaryLength: number;
  maxKeywords: number;
  embeddingModel: string;
  enableEmbeddings: boolean;
}

export class SummaryEmbeddingModeService {
  private static readonly DEFAULT_CONFIG: SummaryModeConfig = {
    maxSummaryLength: 200,
    maxKeywords: 10,
    embeddingModel: 'text-embedding-3-small',
    enableEmbeddings: true
  };

  // Process page in summary mode instead of chunking
  static async processPageSummaryMode(
    sourceId: string,
    url: string,
    htmlContent: string,
    config: Partial<SummaryModeConfig> = {}
  ): Promise<PageSummary> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log(`📄 Processing page in summary mode: ${url}`);
    
    try {
      // Extract and clean content
      const { title, content } = await this.extractCleanContent(htmlContent, url);
      
      // Generate summary and keywords
      const { summary, keywords } = await this.generateSummaryAndKeywords(
        content,
        finalConfig.maxSummaryLength,
        finalConfig.maxKeywords
      );
      
      // Generate embedding if enabled
      let embeddingVector: number[] = [];
      if (finalConfig.enableEmbeddings) {
        embeddingVector = await this.generateEmbedding(summary, finalConfig.embeddingModel);
      }
      
      // Calculate compression metrics
      const originalSize = new TextEncoder().encode(content).length;
      const summarySize = new TextEncoder().encode(summary).length;
      const embeddingSize = embeddingVector.length * 4; // 4 bytes per float
      const compressedSize = summarySize + embeddingSize;
      
      // Store summary data
      await this.storeSummaryData(sourceId, {
        title,
        summary,
        keywords,
        embeddingVector,
        originalSize,
        compressedSize
      });
      
      console.log(`✅ Summary mode processing complete: ${originalSize} → ${compressedSize} bytes (${((1 - compressedSize/originalSize) * 100).toFixed(1)}% savings)`);
      
      return {
        sourceId,
        url,
        title,
        summary,
        keywords,
        embeddingVector,
        originalSize,
        compressedSize,
        processingMode: 'summary'
      };
      
    } catch (error) {
      console.error('Error in summary mode processing:', error);
      throw error;
    }
  }
  
  // Extract and clean content using readability-like algorithm
  private static async extractCleanContent(htmlContent: string, url: string): Promise<{
    title: string;
    content: string;
  }> {
    // Remove scripts, styles, and navigation elements
    const cleanedHtml = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Extract title
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Convert to plain text
    const textContent = cleanedHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(click here|read more|subscribe|sign up|learn more)\b/gi, '')
      .trim();

    return { title, content: textContent };
  }
  
  // Generate summary and extract keywords
  private static async generateSummaryAndKeywords(
    content: string,
    maxSummaryLength: number,
    maxKeywords: number
  ): Promise<{ summary: string; keywords: string[] }> {
    // Extract meaningful sentences for summary
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 5); // Take first 5 meaningful sentences
    
    let summary = sentences.join('. ');
    if (summary.length > maxSummaryLength) {
      summary = summary.substring(0, maxSummaryLength - 3) + '...';
    }
    
    // Extract keywords using frequency analysis
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);

    return { summary, keywords };
  }
  
  // Check if word is a stop word
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
      'one', 'all', 'would', 'there', 'their', 'what', 'so',
      'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
    ]);
    return stopWords.has(word);
  }
  
  // Generate embedding vector (simulated for now)
  private static async generateEmbedding(text: string, model: string): Promise<number[]> {
    try {
      // In production, this would call OpenAI or another embedding API
      // For now, generate a deterministic pseudo-embedding based on text hash
      const hash = await this.simpleHash(text);
      const dimension = 1536; // OpenAI text-embedding-3-small dimension
      
      const embedding: number[] = [];
      for (let i = 0; i < dimension; i++) {
        // Generate deterministic values based on hash and index
        const value = Math.sin(hash + i) * 0.1;
        embedding.push(value);
      }
      
      // Normalize the vector
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / magnitude);
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }
  
  // Simple hash function for deterministic embeddings
  private static async simpleHash(text: string): Promise<number> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert first 4 bytes to number
    let hash = 0;
    for (let i = 0; i < 4; i++) {
      hash = (hash << 8) + hashArray[i];
    }
    return hash;
  }
  
  // Store summary data in agent_sources
  private static async storeSummaryData(sourceId: string, data: {
    title: string;
    summary: string;
    keywords: string[];
    embeddingVector: number[];
    originalSize: number;
    compressedSize: number;
  }): Promise<void> {
    try {
      // Compress the embedding vector for storage
      const embeddingBytes = new Float32Array(data.embeddingVector).buffer;
      const compressedEmbedding = await this.compressData(new Uint8Array(embeddingBytes));
      
      // Update the source record
      const { error } = await supabase
        .from('agent_sources')
        .update({
          title: data.title,
          content_summary: data.summary,
          keywords: data.keywords,
          original_size: data.originalSize,
          compressed_size: data.compressedSize,
          compression_ratio: data.compressedSize / data.originalSize,
          extraction_method: 'summary_mode',
          // Store compressed embedding as base64
          raw_text: Buffer.from(compressedEmbedding).toString('base64')
        })
        .eq('id', sourceId);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error storing summary data:', error);
      throw error;
    }
  }
  
  // Simple compression for embedding data
  private static async compressData(data: Uint8Array): Promise<Uint8Array> {
    try {
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(data);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        // Combine chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        return result;
      }
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
    }
    
    return data;
  }
  
  // Retrieve and decompress summary data
  static async retrieveSummaryData(sourceId: string): Promise<PageSummary | null> {
    try {
      const { data: source, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('id', sourceId)
        .eq('extraction_method', 'summary_mode')
        .single();
      
      if (error || !source) return null;
      
      // Decompress embedding if present
      let embeddingVector: number[] = [];
      if (source.raw_text) {
        try {
          const compressedData = Buffer.from(source.raw_text, 'base64');
          const decompressedData = await this.decompressData(new Uint8Array(compressedData));
          embeddingVector = Array.from(new Float32Array(decompressedData.buffer));
        } catch (error) {
          console.warn('Failed to decompress embedding:', error);
        }
      }
      
      return {
        sourceId: source.id,
        url: source.url || '',
        title: source.title,
        summary: source.content_summary || '',
        keywords: source.keywords || [],
        embeddingVector,
        originalSize: source.original_size || 0,
        compressedSize: source.compressed_size || 0,
        processingMode: 'summary'
      };
      
    } catch (error) {
      console.error('Error retrieving summary data:', error);
      return null;
    }
  }
  
  // Simple decompression
  private static async decompressData(data: Uint8Array): Promise<Uint8Array> {
    try {
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(data);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        // Combine chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        return result;
      }
    } catch (error) {
      console.warn('Decompression failed:', error);
    }
    
    return data;
  }
  
  // Get summary mode statistics
  static async getSummaryModeStats(agentId: string): Promise<{
    totalPages: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    spaceSaved: number;
  }> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('original_size, compressed_size')
        .eq('agent_id', agentId)
        .eq('extraction_method', 'summary_mode')
        .not('original_size', 'is', null)
        .not('compressed_size', 'is', null);
      
      if (error || !sources) {
        return {
          totalPages: 0,
          totalOriginalSize: 0,
          totalCompressedSize: 0,
          averageCompressionRatio: 0,
          spaceSaved: 0
        };
      }
      
      const totalPages = sources.length;
      const totalOriginalSize = sources.reduce((sum, s) => sum + (s.original_size || 0), 0);
      const totalCompressedSize = sources.reduce((sum, s) => sum + (s.compressed_size || 0), 0);
      const averageCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0;
      const spaceSaved = totalOriginalSize - totalCompressedSize;
      
      return {
        totalPages,
        totalOriginalSize,
        totalCompressedSize,
        averageCompressionRatio,
        spaceSaved
      };
      
    } catch (error) {
      console.error('Error getting summary mode stats:', error);
      return {
        totalPages: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        spaceSaved: 0
      };
    }
  }
}
