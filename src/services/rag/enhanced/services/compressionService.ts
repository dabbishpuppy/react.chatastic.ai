
import { CompressionResult } from '../types/compressionTypes';

export class CompressionService {
  private static compressionDictionary: Uint8Array | null = null;
  
  // Generate compression dictionary from common patterns
  private static async generateCompressionDictionary(): Promise<Uint8Array> {
    if (this.compressionDictionary) {
      return this.compressionDictionary;
    }
    
    // Enhanced common patterns for maximum compression
    const commonPatterns = [
      // Ultra-common words for aggressive replacement
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'use',
      
      // Medium frequency words
      'about', 'after', 'again', 'before', 'being', 'below', 'between', 'both', 'during', 'each', 'few', 'from', 'further', 'here', 'into', 'more', 'most', 'other', 'over', 'same', 'some', 'such', 'than', 'that', 'their', 'them', 'these', 'they', 'this', 'those', 'through', 'time', 'very', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
      
      // Website-specific boilerplate (aggressive targeting)
      'contact', 'privacy', 'terms', 'policy', 'service', 'services', 'product', 'products', 'company', 'business', 'website', 'page', 'home', 'information', 'content', 'copyright', 'reserved', 'rights', 'click', 'more', 'read', 'learn', 'view', 'see', 'find', 'search', 'menu', 'navigation', 'subscribe', 'newsletter', 'follow', 'share', 'social', 'media'
    ];
    
    const dictionaryText = commonPatterns.join(' ');
    this.compressionDictionary = new TextEncoder().encode(dictionaryText);
    return this.compressionDictionary;
  }

  // Ultra-aggressive compression targeting 15-20% compression ratio
  static async compressWithMaximumEfficiency(text: string): Promise<CompressionResult> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Attempting ULTRA-AGGRESSIVE compression of ${originalSize} bytes (target: 15-20% ratio)...`);
      
      // Multi-stage compression approach
      const dictionary = await this.generateCompressionDictionary();
      let compressed: Uint8Array;
      let method = 'ultra-aggressive';
      
      try {
        // Stage 1: Text preprocessing for maximum compressibility
        const preprocessed = this.ultraAggressivePreprocessing(text);
        const preprocessedData = new TextEncoder().encode(preprocessed);
        
        // Stage 2: Dictionary-based compression
        if ('CompressionStream' in window || typeof CompressionStream !== 'undefined') {
          compressed = await this.ultraAggressiveGzipCompression(preprocessedData, dictionary);
          method = 'ultra-gzip-dict-preprocessed';
        } else {
          // Stage 3: Fallback to maximum RLE
          compressed = await this.ultraAggressiveRLE(preprocessedData);
          method = 'ultra-rle-preprocessed';
        }
      } catch (error) {
        console.warn('Ultra-aggressive compression failed, using maximum fallback:', error);
        compressed = await this.ultraAggressiveRLE(originalData);
        method = 'ultra-rle-fallback';
      }
      
      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      const savings = Math.round((1 - ratio) * 100);
      
      // Target achievement check
      const targetAchieved = ratio <= 0.20;
      console.log(`✅ Ultra-aggressive compression: ${originalSize} → ${compressedSize} bytes (${(ratio * 100).toFixed(1)}% ratio, ${savings}% savings, target ≤20%: ${targetAchieved ? 'YES' : 'NO'})`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        ratio,
        method,
        savings
      };
      
    } catch (error) {
      console.error('All ultra-aggressive compression methods failed:', error);
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

  // Ultra-aggressive text preprocessing for maximum compression
  private static ultraAggressivePreprocessing(text: string): string {
    // Enhanced dictionary with ultra-short replacements (fixed duplicate keys)
    const ultraCompressionDict: Record<string, string> = {
      // Ultra-common words to single characters
      'the': '∅',
      'and': '∧',
      'for': '∀',
      'are': '∈',
      'that': '∴',
      'this': '∆',
      'with': '∇',
      'have': '∃',
      'will': '∞',
      'from': '∂',
      'they': '∑',
      'been': '∫',
      'more': '±',
      'would': '≠',
      'there': '≤',
      'their': '≥',
      'which': '∪',
      'about': '∩',
      'other': '⊂',
      'after': '⊃',
      'where': '⊆',
      'before': '⊇',
      'through': '⊕',
      'between': '⊗',
      
      // Website-specific ultra-compression (fixed duplicate keys)
      'click': '©',
      'here': '®',
      'read': '™',
      'learn': '§',
      'contact': 'Ç',
      'home': 'Ñ',
      'page': 'ß',
      'menu': 'Ø',
      'search': 'Þ',
      'privacy': 'Ð',
      'terms': 'Æ',
      'service': 'Œ',
      'company': 'Š',
      'information': 'Ž'
    };
    
    let processed = text;
    
    // Stage 1: Ultra-aggressive word replacement
    Object.entries(ultraCompressionDict).forEach(([word, symbol]) => {
      processed = processed.replace(new RegExp(`\\b${word}\\b`, 'gi'), symbol);
    });
    
    // Stage 2: Ultra-aggressive whitespace normalization
    processed = processed
      .replace(/\s+/g, '·') // Replace all whitespace with single symbol
      .replace(/\s*([.,!?;:])\s*/g, '$1') // Remove space around punctuation
      .replace(/([.,!?;:])+/g, '$1'); // Remove duplicate punctuation
    
    // Stage 3: Pattern-based compression
    const patterns = [
      [/ing\b/g, '¤'],
      [/tion\b/g, '¢'],
      [/ment\b/g, '£'],
      [/able\b/g, '¥'],
      [/ness\b/g, '€'],
      [/less\b/g, '¿'],
      [/ful\b/g, '¡'],
      [/ous\b/g, '¬']
    ];
    
    patterns.forEach(([pattern, replacement]) => {
      processed = processed.replace(pattern, replacement as string);
    });
    
    return processed;
  }

  // Ultra-aggressive gzip compression with dictionary
  private static async ultraAggressiveGzipCompression(data: Uint8Array, dictionary: Uint8Array): Promise<Uint8Array> {
    // Pre-process data with dictionary patterns for better compression
    const preprocessed = this.preprocessWithUltraDictionary(data, dictionary);
    
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
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
    
    // Combine and apply post-compression optimization
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  // Enhanced dictionary preprocessing for maximum compression
  private static preprocessWithUltraDictionary(data: Uint8Array, dictionary: Uint8Array): Uint8Array {
    const text = new TextDecoder().decode(data);
    const dictionaryText = new TextDecoder().decode(dictionary);
    const patterns = dictionaryText.split(' ');
    
    let processed = text;
    
    // Replace common patterns with ultra-short tokens
    patterns.forEach((pattern, index) => {
      if (pattern.length > 2) {
        // Use even shorter tokens for better compression
        const token = String.fromCharCode(0x80 + (index % 127)); // Cycle through high ASCII
        processed = processed.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), token);
      }
    });
    
    // Additional pattern optimization
    processed = processed
      .replace(/\b(\w+)\s+\1\b/g, '$1²') // Replace repeated words with superscript
      .replace(/\b(\w{1,3})\s+\1\s+\1\b/g, '$1³') // Triple repetitions
      .replace(/([.!?])\s*\1+/g, '$1'); // Remove repeated punctuation
    
    return new TextEncoder().encode(processed);
  }

  // Ultra-aggressive RLE compression targeting maximum efficiency
  private static async ultraAggressiveRLE(data: Uint8Array): Promise<Uint8Array> {
    const compressed: number[] = [];
    let i = 0;
    
    // Build frequency table for smart encoding
    const frequency = new Map<number, number>();
    for (const byte of data) {
      frequency.set(byte, (frequency.get(byte) || 0) + 1);
    }
    
    // Sort by frequency for optimal encoding
    const sortedBytes = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([byte]) => byte);
    
    // Create mapping for most frequent bytes to shortest codes
    const byteMap = new Map<number, number>();
    sortedBytes.slice(0, 16).forEach((byte, index) => {
      byteMap.set(byte, index + 240); // Use high values 240-255 for frequent bytes
    });
    
    while (i < data.length) {
      const current = data[i];
      let count = 1;
      
      // Count consecutive identical bytes (ultra-aggressive threshold)
      while (i + count < data.length && data[i + count] === current && count < 255) {
        count++;
      }
      
      // Apply ultra-aggressive RLE - compress runs of 2 or more
      if (count >= 2) {
        compressed.push(255, count, current); // 255 is escape byte
      } else {
        // Use frequency-based encoding for single bytes
        const mappedByte = byteMap.get(current);
        if (mappedByte !== undefined) {
          compressed.push(mappedByte);
        } else {
          // Common character optimizations
          if (current === 32) { // Space
            compressed.push(254); // Special marker for space
          } else if (current >= 65 && current <= 90) { // Uppercase A-Z
            compressed.push(253, current - 65); // Compressed uppercase
          } else if (current >= 97 && current <= 122) { // Lowercase a-z
            compressed.push(252, current - 97); // Compressed lowercase
          } else {
            compressed.push(current);
          }
        }
      }
      
      i += count;
    }
    
    return new Uint8Array(compressed);
  }
}
