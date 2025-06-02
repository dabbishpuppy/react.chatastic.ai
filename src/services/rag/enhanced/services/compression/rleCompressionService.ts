
export class RLECompressionService {
  // Enhanced ultra-aggressive RLE compression
  static async ultraAggressiveRLE(data: Uint8Array): Promise<Uint8Array> {
    console.log(`🔄 Starting enhanced RLE compression on ${data.length} bytes...`);
    
    // Convert to string for pattern-based compression
    const text = new TextDecoder().decode(data);
    
    // Apply multiple RLE strategies
    let compressed = text;
    
    // Strategy 1: Compress repeated characters (enhanced)
    compressed = this.compressRepeatedChars(compressed);
    
    // Strategy 2: Compress repeated words and phrases
    compressed = this.compressRepeatedPatterns(compressed);
    
    // Strategy 3: Compress common sequences
    compressed = this.compressCommonSequences(compressed);
    
    // Strategy 4: Byte-level RLE on the result
    const intermediateBytes = new TextEncoder().encode(compressed);
    const finalCompressed = this.byteLevelRLE(intermediateBytes);
    
    const originalSize = data.length;
    const compressedSize = finalCompressed.length;
    const ratio = (compressedSize / originalSize * 100).toFixed(1);
    
    console.log(`✅ Enhanced RLE: ${originalSize} → ${compressedSize} bytes (${ratio}% of original)`);
    
    return finalCompressed;
  }

  // Compress repeated characters more aggressively
  private static compressRepeatedChars(text: string): string {
    // Compress runs of 2+ identical characters
    return text.replace(/(.)\1+/g, (match, char) => {
      const count = match.length;
      if (count >= 2) {
        // Use special encoding: ∞{char}{count}
        return `∞${char}${count}`;
      }
      return match;
    });
  }

  // Compress repeated words and short phrases
  private static compressRepeatedPatterns(text: string): string {
    const words = text.split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    // Count word frequencies
    words.forEach(word => {
      if (word.length >= 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    // Replace frequent words with shorter tokens
    let compressed = text;
    let tokenIndex = 0;
    
    wordCounts.forEach((count, word) => {
      if (count >= 3 && word.length > 4) {
        const token = `∇${tokenIndex.toString(36)}`;
        // Only replace if token is shorter
        if (token.length < word.length) {
          const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
          compressed = compressed.replace(regex, token);
          tokenIndex++;
        }
      }
    });
    
    return compressed;
  }

  // Compress common sequences and patterns
  private static compressCommonSequences(text: string): string {
    const commonSequences = [
      // Common HTML/web patterns
      { pattern: /\s+/g, replacement: ' ' },
      { pattern: /\s*\n\s*/g, replacement: '\n' },
      { pattern: /\s*,\s*/g, replacement: ',' },
      { pattern: /\s*\.\s*/g, replacement: '.' },
      { pattern: /\s*:\s*/g, replacement: ':' },
      { pattern: /\s*;\s*/g, replacement: ';' },
      
      // Common word endings
      { pattern: /tion\b/g, replacement: '∴n' },
      { pattern: /ing\b/g, replacement: '∴g' },
      { pattern: /ment\b/g, replacement: '∴m' },
      { pattern: /ness\b/g, replacement: '∴s' },
      { pattern: /able\b/g, replacement: '∴a' },
      
      // Common prefixes
      { pattern: /\bthe\s+/g, replacement: '∅' },
      { pattern: /\band\s+/g, replacement: '∧' },
      { pattern: /\bwith\s+/g, replacement: '∇' },
    ];

    let compressed = text;
    commonSequences.forEach(({ pattern, replacement }) => {
      compressed = compressed.replace(pattern, replacement);
    });

    return compressed;
  }

  // Enhanced byte-level RLE
  private static byteLevelRLE(data: Uint8Array): Uint8Array {
    const result: number[] = [];
    let i = 0;

    while (i < data.length) {
      const currentByte = data[i];
      let count = 1;

      // Count consecutive identical bytes
      while (i + count < data.length && data[i + count] === currentByte && count < 255) {
        count++;
      }

      if (count >= 3) {
        // Use RLE encoding: [255, byte, count]
        result.push(255, currentByte, count);
      } else {
        // Store bytes as-is if not worth compressing
        for (let j = 0; j < count; j++) {
          // If we encounter 255, escape it as [255, 255, 1]
          if (currentByte === 255) {
            result.push(255, 255, 1);
          } else {
            result.push(currentByte);
          }
        }
      }

      i += count;
    }

    return new Uint8Array(result);
  }
}
