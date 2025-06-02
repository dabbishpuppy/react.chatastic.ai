
import { CompressionResult } from './types';
import { CompressionDictionaryService } from './dictionaryService';
import { TextPreprocessingService } from './preprocessingService';
import { GzipCompressionService } from './gzipCompressionService';
import { RLECompressionService } from './rleCompressionService';

export class CompressionService {
  // Ultra-aggressive compression targeting 80-85% compression ratio (15-20% final size)
  static async compressWithMaximumEfficiency(text: string): Promise<CompressionResult> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Attempting ULTRA-AGGRESSIVE compression of ${originalSize} bytes (target: 80-85% compression)...`);
      
      // Enhanced multi-stage compression approach
      const dictionary = await CompressionDictionaryService.generateCompressionDictionary();
      let compressed: Uint8Array;
      let method = 'ultra-aggressive-v2';
      
      try {
        // Stage 1: Enhanced text preprocessing for maximum compressibility
        let preprocessed = TextPreprocessingService.ultraAggressivePreprocessing(text);
        
        // Stage 2: Additional content optimization
        preprocessed = this.advancedContentOptimization(preprocessed);
        
        // Stage 3: Apply ultra-aggressive dictionary replacement
        preprocessed = this.applyUltraCompressionDictionary(preprocessed);
        
        const preprocessedData = new TextEncoder().encode(preprocessed);
        console.log(`📊 After preprocessing: ${originalSize} → ${preprocessedData.length} bytes (${((preprocessedData.length/originalSize)*100).toFixed(1)}%)`);
        
        // Stage 4: Multi-level compression
        if ('CompressionStream' in window || typeof CompressionStream !== 'undefined') {
          // Apply multiple compression passes
          let currentData = preprocessedData;
          
          // First pass: Dictionary-based gzip
          currentData = await GzipCompressionService.ultraAggressiveGzipCompression(currentData, dictionary);
          console.log(`📊 After gzip: ${currentData.length} bytes`);
          
          // Second pass: Custom RLE on top
          compressed = await RLECompressionService.ultraAggressiveRLE(currentData);
          method = 'multi-stage-gzip-rle';
          console.log(`📊 After RLE: ${compressed.length} bytes`);
        } else {
          // Fallback: Enhanced RLE with better patterns
          compressed = await RLECompressionService.ultraAggressiveRLE(preprocessedData);
          method = 'enhanced-rle-v2';
        }
      } catch (error) {
        console.warn('Enhanced compression failed, using aggressive fallback:', error);
        // Fallback with simpler preprocessing
        const simplePreprocessed = TextPreprocessingService.ultraAggressivePreprocessing(text);
        const simpleData = new TextEncoder().encode(simplePreprocessed);
        compressed = await RLECompressionService.ultraAggressiveRLE(simpleData);
        method = 'aggressive-rle-fallback';
      }
      
      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      const compressionPercentage = Math.round((1 - ratio) * 100);
      
      // Enhanced target achievement check
      const targetAchieved = ratio <= 0.20; // 80% compression or better
      const goodCompression = ratio <= 0.25; // 75% compression or better
      
      console.log(`✅ Enhanced compression: ${originalSize} → ${compressedSize} bytes (${compressionPercentage}% compression, ratio: ${(ratio * 100).toFixed(1)}%)`);
      console.log(`🎯 Target (≥80%): ${targetAchieved ? '✅ ACHIEVED' : goodCompression ? '⚠️ GOOD (75%+)' : '❌ NEEDS IMPROVEMENT'}`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        ratio,
        method,
        savings: compressionPercentage
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

  // Advanced content optimization for better compression
  private static advancedContentOptimization(text: string): string {
    let optimized = text;

    // Remove excessive whitespace more aggressively
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.replace(/\n\s*\n/g, '\n');
    
    // Remove common HTML patterns that add no value
    optimized = optimized.replace(/\s*(class|id|style|data-\w+)="[^"]*"/gi, '');
    optimized = optimized.replace(/<!--.*?-->/gs, '');
    
    // Normalize punctuation and spacing
    optimized = optimized.replace(/\s*[.,;:!?]\s*/g, (match) => match.trim());
    optimized = optimized.replace(/\s*-\s*/g, '-');
    
    // Remove redundant phrases common in websites
    const redundantPhrases = [
      /\b(click here|read more|learn more|find out more)\b/gi,
      /\b(home|contact us|about us|privacy policy|terms of service)\b/gi,
      /\b(copyright|all rights reserved|powered by)\b/gi,
      /\b(subscribe|newsletter|follow us|social media)\b/gi
    ];
    
    redundantPhrases.forEach(pattern => {
      optimized = optimized.replace(pattern, '');
    });
    
    // Final cleanup
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    return optimized;
  }

  // Apply ultra-compression dictionary with better patterns
  private static applyUltraCompressionDictionary(text: string): string {
    const ultraDict = CompressionDictionaryService.getUltraCompressionDict();
    let compressed = text;

    // Apply dictionary replacements with word boundaries for better accuracy
    Object.entries(ultraDict).forEach(([word, replacement]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      compressed = compressed.replace(regex, replacement);
    });

    // Additional aggressive replacements for common patterns
    const additionalReplacements = {
      'website': '∴w',
      'information': '∴i',
      'services': '∴s',
      'products': '∴p',
      'business': '∴b',
      'development': '∴d',
      'technology': '∴t',
      'solution': '∴o',
      'experience': '∴e',
      'professional': '∴r'
    };

    Object.entries(additionalReplacements).forEach(([word, replacement]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      compressed = compressed.replace(regex, replacement);
    });

    return compressed;
  }
}
