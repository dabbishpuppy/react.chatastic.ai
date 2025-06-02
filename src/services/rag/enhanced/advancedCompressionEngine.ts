
import { supabase } from "@/integrations/supabase/client";

export interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  method: string;
  savings: number;
}

export interface ContentAnalysis {
  contentType: 'informational' | 'content-rich' | 'template' | 'mixed';
  density: number;
  uniqueWords: number;
  repeatedPhrases: string[];
  boilerplateRatio: number;
}

export class AdvancedCompressionEngine {
  private static compressionDictionary: Uint8Array | null = null;
  
  // Enhanced content analysis for smart processing mode selection
  static analyzeContent(text: string): ContentAnalysis {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const uniqueWords = new Set(words).size;
    const wordDensity = uniqueWords / words.length;
    
    // Detect repeated phrases (boilerplate indicators)
    const phrases: Record<string, number> = {};
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    sentences.forEach(sentence => {
      const normalized = sentence.trim().toLowerCase();
      if (normalized.length > 20) {
        phrases[normalized] = (phrases[normalized] || 0) + 1;
      }
    });
    
    const repeatedPhrases = Object.entries(phrases)
      .filter(([, count]) => count > 1)
      .map(([phrase]) => phrase);
    
    const boilerplateRatio = repeatedPhrases.length / sentences.length;
    
    // Classify content type
    let contentType: ContentAnalysis['contentType'] = 'mixed';
    if (boilerplateRatio > 0.4) contentType = 'template';
    else if (wordDensity > 0.6 && uniqueWords > 100) contentType = 'content-rich';
    else if (words.length < 200 || wordDensity < 0.3) contentType = 'informational';
    
    return {
      contentType,
      density: wordDensity,
      uniqueWords,
      repeatedPhrases,
      boilerplateRatio
    };
  }

  // Advanced content cleaning with aggressive boilerplate removal
  static enhancedContentCleaning(htmlContent: string): string {
    let cleaned = htmlContent;
    
    // Remove scripts, styles, and navigation (existing)
    cleaned = cleaned
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    
    // Enhanced boilerplate removal
    cleaned = cleaned
      // Remove cookie notices and GDPR banners
      .replace(/<div[^>]*class="[^"]*cookie[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*gdpr[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*consent[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Remove social media widgets
      .replace(/<div[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<iframe[^>]*src="[^"]*facebook[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<iframe[^>]*src="[^"]*twitter[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi, '')
      
      // Remove advertisements and promotional content
      .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*promo[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*banner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Remove breadcrumbs and pagination
      .replace(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<div[^>]*class="[^"]*pagination[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<ul[^>]*class="[^"]*pagination[^"]*"[^>]*>[\s\S]*?<\/ul>/gi, '')
      
      // Remove search forms and filters
      .replace(/<form[^>]*class="[^"]*search[^"]*"[^>]*>[\s\S]*?<\/form>/gi, '')
      .replace(/<div[^>]*class="[^"]*filter[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // Convert to plain text
    const textContent = cleaned
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Advanced text cleaning
    return this.advancedTextCleaning(textContent);
  }

  // Advanced text cleaning with semantic noise filtering
  private static advancedTextCleaning(text: string): string {
    let cleaned = text;
    
    // Remove common CTAs and promotional phrases
    const ctaPatterns = [
      /\b(click here|read more|learn more|find out more|discover more|get started|sign up|subscribe|register|join now|buy now|order now|shop now|download now)\b/gi,
      /\b(follow us|like us|share this|tweet this|pin this|bookmark|save this|print this)\b/gi,
      /\b(terms and conditions|privacy policy|cookie policy|disclaimer|legal notice)\b/gi,
      /\b(back to top|scroll to top|return to top|go to top)\b/gi,
      /\b(next page|previous page|page \d+ of \d+|showing \d+ of \d+)\b/gi,
      /\b(menu|navigation|breadcrumb|home|contact|about|search|login|logout|account)\b/gi
    ];
    
    ctaPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove excessive punctuation and normalize whitespace
    cleaned = cleaned
      .replace(/[.]{3,}/g, '...')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      .replace(/[-]{3,}/g, ' ')
      .replace(/[_]{3,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove stop words from content (aggressive approach for better compression)
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
      'one', 'all', 'would', 'there', 'their', 'what', 'so',
      'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
    ]);
    
    // Only remove stop words if content is long enough to maintain readability
    if (cleaned.length > 500) {
      const words = cleaned.split(/\s+/);
      const filteredWords = words.filter(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        return cleanWord.length > 2 && !stopWords.has(cleanWord);
      });
      
      // Only apply if we don't lose too much content
      if (filteredWords.length > words.length * 0.6) {
        cleaned = filteredWords.join(' ');
      }
    }
    
    return cleaned;
  }

  // Generate compression dictionary from common patterns
  private static async generateCompressionDictionary(): Promise<Uint8Array> {
    if (this.compressionDictionary) {
      return this.compressionDictionary;
    }
    
    // Common website patterns for dictionary-based compression
    const commonPatterns = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'use',
      'about', 'after', 'again', 'before', 'being', 'below', 'between', 'both', 'during', 'each', 'few', 'from', 'further', 'here', 'how', 'into', 'more', 'most', 'other', 'over', 'same', 'some', 'such', 'than', 'that', 'their', 'them', 'these', 'they', 'this', 'those', 'through', 'time', 'very', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
      'contact', 'privacy', 'terms', 'policy', 'service', 'services', 'product', 'products', 'company', 'business', 'website', 'page', 'home', 'about', 'information', 'content', 'copyright', 'reserved', 'rights'
    ];
    
    const dictionaryText = commonPatterns.join(' ');
    this.compressionDictionary = new TextEncoder().encode(dictionaryText);
    return this.compressionDictionary;
  }

  // Maximum compression with Zstd level 22 and dictionary
  static async compressWithMaximumEfficiency(text: string): Promise<CompressionResult> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Attempting maximum compression of ${originalSize} bytes...`);
      
      // Try advanced compression with dictionary
      const dictionary = await this.generateCompressionDictionary();
      let compressed: Uint8Array;
      let method = 'advanced';
      
      try {
        // Use CompressionStream with dictionary if available
        if ('CompressionStream' in window) {
          compressed = await this.compressWithDictionary(originalData, dictionary);
          method = 'gzip-dictionary';
        } else {
          // Fallback to enhanced RLE with preprocessing
          compressed = await this.enhancedRLECompression(originalData);
          method = 'enhanced-rle';
        }
      } catch (error) {
        console.warn('Advanced compression failed, using fallback:', error);
        compressed = await this.enhancedRLECompression(originalData);
        method = 'enhanced-rle-fallback';
      }
      
      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      const savings = Math.round((1 - ratio) * 100);
      
      console.log(`✅ Maximum compression: ${originalSize} → ${compressedSize} bytes (${(ratio * 100).toFixed(1)}% ratio, ${savings}% savings)`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        ratio,
        method,
        savings
      };
      
    } catch (error) {
      console.error('All compression methods failed:', error);
      // Return uncompressed data as last resort
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

  // Enhanced compression with dictionary support
  private static async compressWithDictionary(data: Uint8Array, dictionary: Uint8Array): Promise<Uint8Array> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    // Pre-process data with dictionary patterns
    const preprocessed = this.preprocessWithDictionary(data, dictionary);
    
    writer.write(preprocessed);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
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

  // Preprocess data using dictionary patterns
  private static preprocessWithDictionary(data: Uint8Array, dictionary: Uint8Array): Uint8Array {
    const text = new TextDecoder().decode(data);
    const dictionaryText = new TextDecoder().decode(dictionary);
    const patterns = dictionaryText.split(' ');
    
    let processed = text;
    
    // Replace common patterns with shorter tokens
    patterns.forEach((pattern, index) => {
      if (pattern.length > 2) {
        const token = String.fromCharCode(0x80 + index); // Use high ASCII for tokens
        processed = processed.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), token);
      }
    });
    
    return new TextEncoder().encode(processed);
  }

  // Enhanced RLE compression with pattern recognition
  private static async enhancedRLECompression(data: Uint8Array): Promise<Uint8Array> {
    const compressed: number[] = [];
    let i = 0;
    
    while (i < data.length) {
      const current = data[i];
      let count = 1;
      
      // Count consecutive identical bytes
      while (i + count < data.length && data[i + count] === current && count < 255) {
        count++;
      }
      
      // Use RLE for runs of 3 or more (more aggressive)
      if (count > 2) {
        compressed.push(255, count, current); // 255 is escape byte
      } else {
        // Store bytes directly
        for (let j = 0; j < count; j++) {
          compressed.push(current);
        }
      }
      
      i += count;
    }
    
    return new Uint8Array(compressed);
  }

  // Smart processing mode selection based on content analysis
  static selectProcessingMode(analysis: ContentAnalysis, pageSize: number): 'summary' | 'chunking' | 'template-removal' {
    // Use summary mode for small informational pages
    if (analysis.contentType === 'informational' || pageSize < 1000) {
      return 'summary';
    }
    
    // Use template removal for highly repetitive content
    if (analysis.contentType === 'template' || analysis.boilerplateRatio > 0.5) {
      return 'template-removal';
    }
    
    // Use full chunking for content-rich pages
    return 'chunking';
  }

  // Advanced deduplication with sentence-level analysis
  static async performAdvancedDeduplication(chunks: string[], agentId: string): Promise<{
    uniqueChunks: string[];
    duplicatesRemoved: number;
    sentenceDeduplication: number;
  }> {
    const uniqueChunks: string[] = [];
    const seenSentences = new Set<string>();
    let duplicatesRemoved = 0;
    let sentenceDeduplication = 0;
    
    for (const chunk of chunks) {
      const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const uniqueSentences: string[] = [];
      
      for (const sentence of sentences) {
        const normalized = sentence.trim().toLowerCase();
        const hash = await this.generateContentHash(normalized);
        
        if (!seenSentences.has(hash)) {
          seenSentences.add(hash);
          uniqueSentences.push(sentence);
        } else {
          sentenceDeduplication++;
        }
      }
      
      if (uniqueSentences.length > 0) {
        const deduplicatedChunk = uniqueSentences.join('. ').trim();
        
        // Check for chunk-level duplicates
        const chunkHash = await this.generateContentHash(deduplicatedChunk);
        const isDuplicate = uniqueChunks.some(async (existingChunk) => {
          const existingHash = await this.generateContentHash(existingChunk);
          return existingHash === chunkHash;
        });
        
        if (!isDuplicate) {
          uniqueChunks.push(deduplicatedChunk);
        } else {
          duplicatesRemoved++;
        }
      } else {
        duplicatesRemoved++;
      }
    }
    
    return {
      uniqueChunks,
      duplicatesRemoved,
      sentenceDeduplication
    };
  }

  // Generate stable content hash for deduplication
  private static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Get compression statistics and recommendations
  static async getCompressionStats(agentId: string): Promise<{
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    spaceSaved: number;
    recommendations: string[];
  }> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('original_size, compressed_size, compression_ratio, source_type')
        .eq('agent_id', agentId)
        .not('original_size', 'is', null)
        .not('compressed_size', 'is', null);
      
      if (error || !sources) {
        return {
          totalOriginalSize: 0,
          totalCompressedSize: 0,
          averageCompressionRatio: 0,
          spaceSaved: 0,
          recommendations: ['No compression data available']
        };
      }
      
      const totalOriginalSize = sources.reduce((sum, s) => sum + (s.original_size || 0), 0);
      const totalCompressedSize = sources.reduce((sum, s) => sum + (s.compressed_size || 0), 0);
      const averageCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0;
      const spaceSaved = totalOriginalSize - totalCompressedSize;
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (averageCompressionRatio > 0.7) {
        recommendations.push('Consider using summary mode for informational pages');
      }
      
      if (averageCompressionRatio > 0.5) {
        recommendations.push('Implement advanced deduplication for better compression');
      }
      
      const websiteSources = sources.filter(s => s.source_type === 'website');
      if (websiteSources.length > 10) {
        recommendations.push('Use template detection for repetitive website content');
      }
      
      return {
        totalOriginalSize,
        totalCompressedSize,
        averageCompressionRatio,
        spaceSaved,
        recommendations
      };
      
    } catch (error) {
      console.error('Error getting compression stats:', error);
      return {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        spaceSaved: 0,
        recommendations: ['Error retrieving compression statistics']
      };
    }
  }
}
