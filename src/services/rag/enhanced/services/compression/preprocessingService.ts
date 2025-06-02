
export class TextPreprocessingService {
  // Enhanced ultra-aggressive preprocessing for maximum compression
  static ultraAggressivePreprocessing(text: string): string {
    console.log(`🔄 Starting enhanced preprocessing on ${text.length} characters...`);
    
    let processed = text;

    // Stage 1: Normalize and clean whitespace more aggressively
    processed = this.aggressiveWhitespaceNormalization(processed);
    
    // Stage 2: Remove redundant HTML and markup
    processed = this.removeRedundantMarkup(processed);
    
    // Stage 3: Normalize common patterns
    processed = this.normalizeCommonPatterns(processed);
    
    // Stage 4: Apply content-aware optimization
    processed = this.contentAwareOptimization(processed);
    
    // Stage 5: Final cleanup and normalization
    processed = this.finalCleanup(processed);
    
    const reductionPercent = ((text.length - processed.length) / text.length * 100).toFixed(1);
    console.log(`✅ Preprocessing: ${text.length} → ${processed.length} chars (${reductionPercent}% reduction)`);
    
    return processed;
  }

  // Aggressive whitespace normalization
  private static aggressiveWhitespaceNormalization(text: string): string {
    let normalized = text;
    
    // Remove all leading/trailing whitespace from lines
    normalized = normalized.replace(/^[\s\t]+|[\s\t]+$/gm, '');
    
    // Collapse multiple spaces into single space
    normalized = normalized.replace(/[ \t]+/g, ' ');
    
    // Collapse multiple newlines into single newline
    normalized = normalized.replace(/\n\s*\n\s*\n/g, '\n\n');
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    // Remove spaces around punctuation
    normalized = normalized.replace(/\s*([,.;:!?])\s*/g, '$1 ');
    normalized = normalized.replace(/\s*([(){}[\]])\s*/g, '$1');
    
    return normalized.trim();
  }

  // Remove redundant markup and HTML artifacts
  private static removeRedundantMarkup(text: string): string {
    let cleaned = text;
    
    // Remove HTML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove script and style tags completely
    cleaned = cleaned.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    
    // Remove common attributes that don't affect content
    cleaned = cleaned.replace(/\s*(class|id|style|data-[\w-]+)="[^"]*"/gi, '');
    cleaned = cleaned.replace(/\s*(class|id|style|data-[\w-]+)='[^']*'/gi, '');
    
    // Remove empty tags
    cleaned = cleaned.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, '');
    
    // Normalize remaining HTML tags
    cleaned = cleaned.replace(/<\s+/g, '<');
    cleaned = cleaned.replace(/\s+>/g, '>');
    
    return cleaned;
  }

  // Normalize common patterns for better compression
  private static normalizeCommonPatterns(text: string): string {
    let normalized = text;
    
    // Normalize URLs
    normalized = normalized.replace(/https?:\/\//g, 'ⱨ://');
    normalized = normalized.replace(/www\./g, 'ⱳ.');
    
    // Normalize email patterns
    normalized = normalized.replace(/@/g, 'ⱦ');
    
    // Normalize common number patterns
    normalized = normalized.replace(/\b\d{4}\b/g, '※'); // Years
    normalized = normalized.replace(/\$\d+/g, '₱'); // Prices
    
    // Normalize common technical terms
    const techTerms = {
      'javascript': 'ʲˢ',
      'typescript': 'ᵗˢ',
      'python': 'ᵖʸ',
      'github': 'ᵍʰ',
      'database': 'ᵈᵇ',
      'application': 'ᵃᵖᵖ',
      'development': 'ᵈᵉᵛ',
      'environment': 'ᵉⁿᵛ',
      'configuration': 'ᶜᶠᵍ',
      'documentation': 'ᵈᵒᶜˢ'
    };
    
    Object.entries(techTerms).forEach(([term, replacement]) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      normalized = normalized.replace(regex, replacement);
    });
    
    return normalized;
  }

  // Content-aware optimization based on content type
  private static contentAwareOptimization(text: string): string {
    let optimized = text;
    
    // If this looks like web content, apply web-specific optimizations
    if (this.isWebContent(text)) {
      optimized = this.optimizeWebContent(optimized);
    }
    
    // If this looks like code, apply code-specific optimizations
    if (this.isCodeContent(text)) {
      optimized = this.optimizeCodeContent(optimized);
    }
    
    // Apply general content optimizations
    optimized = this.applyGeneralOptimizations(optimized);
    
    return optimized;
  }

  // Check if content appears to be web content
  private static isWebContent(text: string): boolean {
    const webIndicators = [
      /<[^>]+>/,  // HTML tags
      /href=|src=/,  // HTML attributes
      /class=|id=/,  // CSS classes/IDs
      /\.html|\.css|\.js/,  // File extensions
      /privacy|contact|about|home/i  // Common page types
    ];
    
    return webIndicators.some(pattern => pattern.test(text));
  }

  // Check if content appears to be code
  private static isCodeContent(text: string): boolean {
    const codeIndicators = [
      /function\s+\w+\s*\(/,  // Function definitions
      /import\s+.*from/,     // Import statements
      /const\s+\w+\s*=/,     // Variable declarations
      /\{\s*[\w\s:,]+\s*\}/  // Object literals
    ];
    
    return codeIndicators.some(pattern => pattern.test(text));
  }

  // Optimize web content specifically
  private static optimizeWebContent(text: string): string {
    let optimized = text;
    
    // Remove common boilerplate text
    const boilerplate = [
      /privacy policy|terms of service|cookie policy/gi,
      /all rights reserved|copyright \d{4}/gi,
      /powered by \w+|built with \w+/gi,
      /subscribe to our newsletter/gi,
      /follow us on social media/gi
    ];
    
    boilerplate.forEach(pattern => {
      optimized = optimized.replace(pattern, '');
    });
    
    // Compress common web phrases
    optimized = optimized.replace(/click here to/gi, '→');
    optimized = optimized.replace(/read more about/gi, '»');
    optimized = optimized.replace(/learn more/gi, '⇢');
    
    return optimized;
  }

  // Optimize code content specifically
  private static optimizeCodeContent(text: string): string {
    let optimized = text;
    
    // Normalize indentation
    optimized = optimized.replace(/\t/g, '  '); // Convert tabs to 2 spaces
    optimized = optimized.replace(/^    /gm, '  '); // Reduce 4-space indents to 2
    
    // Remove excessive blank lines in code
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return optimized;
  }

  // Apply general optimizations
  private static applyGeneralOptimizations(text: string): string {
    let optimized = text;
    
    // Remove excessive punctuation
    optimized = optimized.replace(/[!]{2,}/g, '!');
    optimized = optimized.replace(/[?]{2,}/g, '?');
    optimized = optimized.replace(/[.]{3,}/g, '...');
    
    // Normalize quotes
    optimized = optimized.replace(/[""]/g, '"');
    optimized = optimized.replace(/['']/g, "'");
    
    // Remove redundant words
    optimized = optimized.replace(/\b(very|really|quite|rather|just|simply)\s+/gi, '');
    
    return optimized;
  }

  // Final cleanup pass
  private static finalCleanup(text: string): string {
    let cleaned = text;
    
    // Final whitespace cleanup
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\n /g, '\n');
    cleaned = cleaned.replace(/ \n/g, '\n');
    
    // Remove any remaining multiple consecutive spaces
    cleaned = cleaned.replace(/  +/g, ' ');
    
    return cleaned.trim();
  }

  // Apply ultra dictionary compression
  static preprocessWithUltraDictionary(data: Uint8Array, dictionary: Uint8Array): Uint8Array {
    const text = new TextDecoder().decode(data);
    const dictionaryText = new TextDecoder().decode(dictionary);
    
    // Apply dictionary patterns more aggressively
    let processed = text;
    
    // Split dictionary into words and apply each
    const dictWords = dictionaryText.split(' ');
    dictWords.forEach((word, index) => {
      if (word.length > 3) {
        const token = `∇${index.toString(36)}`;
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        processed = processed.replace(regex, token);
      }
    });
    
    return new TextEncoder().encode(processed);
  }
}
