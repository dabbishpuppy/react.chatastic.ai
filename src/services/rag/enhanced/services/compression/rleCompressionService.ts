
export class RLECompressionService {
  // Ultra-aggressive RLE compression targeting maximum efficiency
  static async ultraAggressiveRLE(data: Uint8Array): Promise<Uint8Array> {
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

  // Maximum RLE compression with ultra-aggressive settings
  static async maximumRLECompression(data: Uint8Array): Promise<Uint8Array> {
    const compressed: number[] = [];
    let i = 0;
    
    while (i < data.length) {
      const current = data[i];
      let count = 1;
      
      // Count consecutive identical bytes (more aggressive)
      while (i + count < data.length && data[i + count] === current && count < 255) {
        count++;
      }
      
      // Use RLE for runs of 2 or more (very aggressive)
      if (count > 1) {
        compressed.push(255, count, current); // 255 is escape byte
      } else {
        // For single bytes, check if they're common and can be optimized
        if (current === 32) { // Space character
          compressed.push(254); // Special marker for space
        } else {
          compressed.push(current);
        }
      }
      
      i += count;
    }
    
    return new Uint8Array(compressed);
  }
}
