
import { DeduplicationResult } from '../types/compressionTypes';

export class DeduplicationService {
  // Advanced deduplication with sentence-level analysis
  static async performAdvancedDeduplication(chunks: string[], agentId: string): Promise<DeduplicationResult> {
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
}
