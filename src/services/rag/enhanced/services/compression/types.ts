
export interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  method: string;
  savings: number;
}

export interface CompressionDictionary {
  patterns: string[];
  replacements: Record<string, string>;
}
