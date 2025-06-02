
import { CompressionResult } from './types';
import { CompressionDictionaryService } from './dictionaryService';
import { TextPreprocessingService } from './preprocessingService';
import { GzipCompressionService } from './gzipCompressionService';
import { RLECompressionService } from './rleCompressionService';

export class CompressionService {
  // Ultra-aggressive compression targeting 15-20% compression ratio
  static async compressWithMaximumEfficiency(text: string): Promise<CompressionResult> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Attempting ULTRA-AGGRESSIVE compression of ${originalSize} bytes (target: 15-20% ratio)...`);
      
      // Multi-stage compression approach
      const dictionary = await CompressionDictionaryService.generateCompressionDictionary();
      let compressed: Uint8Array;
      let method = 'ultra-aggressive';
      
      try {
        // Stage 1: Text preprocessing for maximum compressibility
        const preprocessed = TextPreprocessingService.ultraAggressivePreprocessing(text);
        const preprocessedData = new TextEncoder().encode(preprocessed);
        
        // Stage 2: Dictionary-based compression
        if ('CompressionStream' in window || typeof CompressionStream !== 'undefined') {
          compressed = await GzipCompressionService.ultraAggressiveGzipCompression(preprocessedData, dictionary);
          method = 'ultra-gzip-dict-preprocessed';
        } else {
          // Stage 3: Fallback to maximum RLE
          compressed = await RLECompressionService.ultraAggressiveRLE(preprocessedData);
          method = 'ultra-rle-preprocessed';
        }
      } catch (error) {
        console.warn('Ultra-aggressive compression failed, using maximum fallback:', error);
        compressed = await RLECompressionService.ultraAggressiveRLE(originalData);
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
}
