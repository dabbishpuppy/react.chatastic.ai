
export interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  method: string;
  savings: number;
}

export interface ContentAnalysis {
  contentType: 'informational' | 'content-rich' | 'template' | 'mixed';
  density: number;
  uniqueWords: number;
  repeatedPhrases: string[];
  boilerplateRatio: number;
}

export interface DeduplicationResult {
  uniqueChunks: string[];
  duplicatesRemoved: number;
  sentenceDeduplication: number;
}

export interface CompressionStats {
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  spaceSaved: number;
  recommendations: string[];
}
