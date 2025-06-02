
import { CompressionDictionaryService } from './dictionaryService';

export class TextPreprocessingService {
  // Ultra-aggressive text preprocessing for maximum compression
  static ultraAggressivePreprocessing(text: string): string {
    const ultraCompressionDict = CompressionDictionaryService.getUltraCompressionDict();
    
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

  // Enhanced dictionary preprocessing for maximum compression
  static preprocessWithUltraDictionary(data: Uint8Array, dictionary: Uint8Array): Uint8Array {
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

  // Preprocess text for maximum compression efficiency
  static preprocessForMaxCompression(text: string): string {
    // Dictionary-based replacement for common patterns
    const compressionDict: Record<string, string> = {
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
      'after': '⊃'
    };
    
    let processed = text;
    
    // Replace common words with symbols
    Object.entries(compressionDict).forEach(([word, symbol]) => {
      processed = processed.replace(new RegExp(`\\b${word}\\b`, 'gi'), symbol);
    });
    
    // Normalize whitespace more aggressively
    processed = processed
      .replace(/\s+/g, ' ')
      .replace(/\s*([.,!?;:])\s*/g, '$1')
      .trim();
    
    return processed;
  }
}
