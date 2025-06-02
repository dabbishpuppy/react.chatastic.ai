
import { CompressionResult } from './types';
import { CompressionDictionaryService } from './dictionaryService';
import { TextPreprocessingService } from './preprocessingService';
import { GzipCompressionService } from './gzipCompressionService';
import { RLECompressionService } from './rleCompressionService';

export class CompressionService {
  // ULTRA-MAXIMUM compression targeting 85-90% compression ratio (10-15% final size)
  static async compressWithMaximumEfficiency(text: string): Promise<CompressionResult> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Attempting MAXIMUM EFFICIENCY compression of ${originalSize} bytes (target: 85-90% compression)...`);
      
      // Phase 1: Ultra-aggressive content cleaning and preprocessing
      let preprocessed = TextPreprocessingService.ultraAggressivePreprocessing(text);
      
      // Phase 2: Maximum content optimization
      preprocessed = this.maximumContentOptimization(preprocessed);
      
      // Phase 3: Apply maximum compression dictionary
      preprocessed = this.applyMaximumCompressionDictionary(preprocessed);
      
      // Phase 4: Advanced pattern replacement for web content
      preprocessed = this.advancedWebContentOptimization(preprocessed);
      
      const preprocessedData = new TextEncoder().encode(preprocessed);
      console.log(`📊 After maximum preprocessing: ${originalSize} → ${preprocessedData.length} bytes (${((preprocessedData.length/originalSize)*100).toFixed(1)}%)`);
      
      let compressed: Uint8Array;
      let method = 'maximum-efficiency-v3';
      
      try {
        // Phase 5: Multi-level maximum compression
        if ('CompressionStream' in window || typeof CompressionStream !== 'undefined') {
          // Apply multiple compression passes with maximum settings
          let currentData = preprocessedData;
          
          // First pass: Maximum dictionary-based gzip
          const dictionary = await CompressionDictionaryService.generateCompressionDictionary();
          currentData = await GzipCompressionService.ultraAggressiveGzipCompression(currentData, dictionary);
          console.log(`📊 After maximum gzip: ${currentData.length} bytes`);
          
          // Second pass: Maximum RLE compression
          currentData = await RLECompressionService.ultraAggressiveRLE(currentData);
          console.log(`📊 After maximum RLE: ${currentData.length} bytes`);
          
          // Third pass: Additional byte-level optimization
          compressed = this.finalByteOptimization(currentData);
          method = 'maximum-multi-stage-compression';
          console.log(`📊 After final optimization: ${compressed.length} bytes`);
        } else {
          // Fallback: Maximum RLE with enhanced patterns
          compressed = await RLECompressionService.ultraAggressiveRLE(preprocessedData);
          compressed = this.finalByteOptimization(compressed);
          method = 'maximum-rle-optimization';
        }
      } catch (error) {
        console.warn('Maximum compression failed, using aggressive fallback:', error);
        const simplePreprocessed = TextPreprocessingService.ultraAggressivePreprocessing(text);
        const simpleData = new TextEncoder().encode(simplePreprocessed);
        compressed = await RLECompressionService.ultraAggressiveRLE(simpleData);
        compressed = this.finalByteOptimization(compressed);
        method = 'maximum-fallback-compression';
      }
      
      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      const compressionPercentage = Math.round((1 - ratio) * 100);
      
      // Enhanced target achievement check for 85-90% compression
      const maxTargetAchieved = ratio <= 0.15; // 85% compression or better
      const highTargetAchieved = ratio <= 0.20; // 80% compression or better
      const goodTargetAchieved = ratio <= 0.25; // 75% compression or better
      
      console.log(`✅ Maximum compression complete: ${originalSize} → ${compressedSize} bytes (${compressionPercentage}% compression, ratio: ${(ratio * 100).toFixed(1)}%)`);
      console.log(`🎯 Target achievement: ${
        maxTargetAchieved ? '🚀 MAXIMUM ACHIEVED (85%+)' :
        highTargetAchieved ? '⭐ HIGH ACHIEVED (80%+)' :
        goodTargetAchieved ? '✅ GOOD ACHIEVED (75%+)' : 
        '⚠️ NEEDS IMPROVEMENT'
      }`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        ratio,
        method,
        savings: compressionPercentage
      };
      
    } catch (error) {
      console.error('All maximum compression methods failed:', error);
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

  // Maximum content optimization for ultra-high compression ratios
  private static maximumContentOptimization(text: string): string {
    let optimized = text;

    // Ultra-aggressive whitespace removal
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n');
    
    // Remove all HTML attributes that don't affect content
    optimized = optimized.replace(/\s*(class|id|style|data-\w+|role|aria-\w+|tabindex)="[^"]*"/gi, '');
    optimized = optimized.replace(/<!--.*?-->/gs, '');
    
    // Ultra-aggressive punctuation normalization
    optimized = optimized.replace(/\s*[.,;:!?]\s*/g, (match) => match.trim());
    optimized = optimized.replace(/\s*-\s*/g, '-');
    optimized = optimized.replace(/\s*—\s*/g, '—');
    
    // Remove maximum redundant web phrases
    const maxRedundantPhrases = [
      /\b(click here|read more|learn more|find out more|discover more|explore more)\b/gi,
      /\b(home|contact us|about us|privacy policy|terms of service|cookie policy)\b/gi,
      /\b(copyright|all rights reserved|powered by|designed by|built with)\b/gi,
      /\b(subscribe|newsletter|follow us|social media|share this|like us)\b/gi,
      /\b(sign up|log in|register|create account|join now|get started)\b/gi,
      /\b(view all|see more|show more|load more|view details|full story)\b/gi,
      /\b(download|print|email|save|bookmark|favorite)\b/gi
    ];
    
    maxRedundantPhrases.forEach(pattern => {
      optimized = optimized.replace(pattern, '');
    });
    
    // Maximum whitespace cleanup
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    return optimized;
  }

  // Apply maximum compression dictionary with ultra-short replacements
  private static applyMaximumCompressionDictionary(text: string): string {
    const maxDict = CompressionDictionaryService.getUltraCompressionDict();
    let compressed = text;

    // Apply enhanced dictionary replacements
    Object.entries(maxDict).forEach(([word, replacement]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      compressed = compressed.replace(regex, replacement);
    });

    // Maximum compression replacements using single characters
    const maximumReplacements = {
      'website': '∴',
      'information': '∞',
      'services': '§',
      'products': '¶',
      'business': '¤',
      'development': '†',
      'technology': '‡',
      'solution': '◊',
      'experience': '★',
      'professional': '♦',
      'management': '♠',
      'support': '♣',
      'customer': '♥',
      'quality': '◄',
      'industry': '►',
      'company': '▲',
      'team': '▼',
      'project': '◆',
      'system': '■',
      'process': '●',
      'market': '▪',
      'strategy': '▫',
      'software': '□',
      'digital': '☆',
      'innovative': '☂',
      'effective': '☀',
      'efficient': '☁',
      'successful': '☃'
    };

    Object.entries(maximumReplacements).forEach(([word, replacement]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      compressed = compressed.replace(regex, replacement);
    });

    return compressed;
  }

  // Advanced web content optimization for maximum compression
  private static advancedWebContentOptimization(text: string): string {
    let optimized = text;

    // Remove navigation and layout elements completely
    optimized = optimized.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    optimized = optimized.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    optimized = optimized.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    optimized = optimized.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    optimized = optimized.replace(/<sidebar[^>]*>[\s\S]*?<\/sidebar>/gi, '');

    // Remove all ads, promotional, and social content
    optimized = optimized.replace(/<div[^>]*class="[^"]*(?:ad|advertisement|promo|social|share|newsletter)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Ultra-aggressive CTA and marketing phrase removal
    const marketingPatterns = [
      /\b(buy now|order now|shop now|purchase|sale|discount|offer|deal|limited time)\b/gi,
      /\b(free trial|money back|guarantee|no risk|instant|immediate|urgent)\b/gi,
      /\b(exclusive|premium|luxury|professional|enterprise|advanced)\b/gi,
      /\b(award winning|industry leading|best in class|top rated|certified)\b/gi
    ];
    
    marketingPatterns.forEach(pattern => {
      optimized = optimized.replace(pattern, '');
    });

    // Convert remaining HTML to plain text more aggressively
    optimized = optimized.replace(/<[^>]+>/g, ' ');
    
    // Ultra-normalize whitespace
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.replace(/\n\s+/g, '\n');
    optimized = optimized.replace(/\s+\n/g, '\n');
    
    return optimized.trim();
  }

  // Final byte-level optimization for maximum compression
  private static finalByteOptimization(data: Uint8Array): Uint8Array {
    const result: number[] = [];
    let i = 0;

    while (i < data.length) {
      const currentByte = data[i];
      let count = 1;

      // Count consecutive identical bytes with maximum efficiency
      while (i + count < data.length && data[i + count] === currentByte && count < 255) {
        count++;
      }

      // Use ultra-efficient encoding for any sequence of 2 or more
      if (count >= 2) {
        // Ultra-compact encoding: [254, byte, count]
        result.push(254, currentByte, count);
      } else {
        // Escape special bytes
        if (currentByte === 254) {
          result.push(254, 254, 1);
        } else {
          result.push(currentByte);
        }
      }

      i += count;
    }

    return new Uint8Array(result);
  }
}
