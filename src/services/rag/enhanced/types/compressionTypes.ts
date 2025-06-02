
// Types for compression functionality
export interface ContentAnalysis {
  contentType: 'content-rich' | 'informational' | 'template' | 'mixed';
  density: number;
  uniqueWords: number;
  repeatedPhrases: string[];
  boilerplateRatio: number;
}

export interface CompressionResult {
  compressedChunks: string[];
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  strategy: string;
}

export interface DeduplicationResult {
  uniqueChunks: string[];
  duplicatesRemoved: number;
  sentenceDeduplication: number;
}

export interface CompressionStats {
  totalSavings: number;
  averageCompressionRatio: number;
  totalProcessedChunks: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  strategiesUsed: string[];
  processingTimeStats: {
    average: number;
    min: number;
    max: number;
  };
}
