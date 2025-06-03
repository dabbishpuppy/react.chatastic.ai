
export class QAChunkForcer {
  static createForcedChunkIfNeeded(
    sourceType: string, 
    chunks: any[], 
    contentToProcess: string
  ): any[] {
    // For Q&A sources with very short content, ensure at least one chunk is created
    if (sourceType === 'qa' && chunks.length === 0 && contentToProcess.trim().length > 0) {
      console.log(`🔧 Creating forced chunk for short Q&A content: "${contentToProcess}"`);
      
      // Create a minimal chunk manually for very short Q&A content
      const forcedChunk = {
        content: contentToProcess.trim(),
        tokenCount: Math.max(1, Math.ceil(contentToProcess.length / 4)), // Rough token estimate
        chunkIndex: 0,
        metadata: {
          startPosition: 0,
          endPosition: contentToProcess.length,
          sentences: 1,
          semanticBoundary: true,
          contentType: 'paragraph' as const, // Use 'paragraph' instead of 'qa' to match allowed types
          qualityScore: 0.5,
          complexity: 'simple' as const,
          // Add forceCreated as a custom property in metadata
          isForceCreated: true
        }
      };
      
      const updatedChunks = [...chunks, forcedChunk];
      console.log(`✅ Force-created chunk for Q&A: ${updatedChunks.length} total chunks`);
      return updatedChunks;
    }

    return chunks;
  }
}
