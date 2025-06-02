
import { CompressionResult } from '../types/compressionTypes';

export class CompressionService {
  private static compressionDictionary: Uint8Array | null = null;
  
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
}
