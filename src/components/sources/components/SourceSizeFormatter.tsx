
import { AgentSource } from '@/types/rag';

export const formatFileSize = (source: AgentSource): string => {
  let sizeInBytes = 0;

  // Handle different source types with priority for compressed data
  if (source.source_type === 'website') {
    // For website sources, prioritize compressed sizes first
    if (source.compressed_content_size && source.compressed_content_size > 0) {
      sizeInBytes = source.compressed_content_size;
    } else if (source.compressed_size && source.compressed_size > 0) {
      sizeInBytes = source.compressed_size;
    } else if (source.total_content_size && source.total_content_size > 0) {
      sizeInBytes = source.total_content_size;
    } else if (source.original_size && source.original_size > 0) {
      sizeInBytes = source.original_size;
    } else if (source.content) {
      sizeInBytes = source.content.length;
    }
  } else {
    // For non-website sources, use metadata file_size first, then other fields
    if (source.metadata?.file_size && source.metadata.file_size > 0) {
      sizeInBytes = source.metadata.file_size;
    } else if (source.original_size && source.original_size > 0) {
      sizeInBytes = source.original_size;
    } else if (source.content) {
      sizeInBytes = source.content.length;
    }
  }

  // Convert bytes to human readable format
  if (sizeInBytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));
  
  const size = sizeInBytes / Math.pow(k, i);
  const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
  
  return `${formattedSize} ${sizes[i]}`;
};

export const getCompressionInfo = (source: AgentSource): { 
  ratio: number; 
  originalSize: number; 
  compressedSize: number;
  method?: string;
  spaceSaved?: number;
  processingMode?: string;
} | null => {
  // Show compression info for website sources that have compression data
  if (source.source_type !== 'website') {
    return null;
  }

  let originalSize = 0;
  let compressedSize = 0;
  let ratio = 0;

  // Get original size (prioritize aggregated fields)
  if (source.total_content_size && source.total_content_size > 0) {
    originalSize = source.total_content_size;
  } else if (source.original_size && source.original_size > 0) {
    originalSize = source.original_size;
  }

  // Get compressed size (prioritize aggregated fields)
  if (source.compressed_content_size && source.compressed_content_size > 0) {
    compressedSize = source.compressed_content_size;
  } else if (source.compressed_size && source.compressed_size > 0) {
    compressedSize = source.compressed_size;
  }

  // Calculate ratio (prioritize aggregated fields)
  if (source.global_compression_ratio && source.global_compression_ratio > 0) {
    ratio = source.global_compression_ratio;
  } else if (source.compression_ratio && source.compression_ratio > 0) {
    ratio = source.compression_ratio;
  } else if (originalSize > 0 && compressedSize > 0) {
    ratio = compressedSize / originalSize;
  }

  // Only return if we have meaningful data
  if (originalSize > 0 && compressedSize > 0 && ratio > 0) {
    const spaceSaved = originalSize - compressedSize;
    const metadata = source.metadata as any;
    
    return { 
      ratio, 
      originalSize, 
      compressedSize,
      method: metadata?.compression_method || 'standard',
      spaceSaved,
      processingMode: metadata?.processing_mode || 'chunking'
    };
  }

  return null;
};

// Helper function to determine if we're showing compressed size
export const isShowingCompressedSize = (source: AgentSource): boolean => {
  if (source.source_type === 'website') {
    return (source.compressed_content_size && source.compressed_content_size > 0) ||
           (source.compressed_size && source.compressed_size > 0);
  }
  return false;
};

// Enhanced compression savings calculation
export const getCompressionSavings = (source: AgentSource): number | null => {
  const compressionInfo = getCompressionInfo(source);
  if (!compressionInfo) return null;
  
  const { ratio } = compressionInfo;
  return Math.round((1 - ratio) * 100);
};

// New: Get advanced compression details
export const getAdvancedCompressionDetails = (source: AgentSource): {
  method: string;
  processingMode: string;
  spaceSavedKB: number;
  optimizationLevel: 'basic' | 'advanced' | 'maximum';
} | null => {
  const compressionInfo = getCompressionInfo(source);
  if (!compressionInfo) return null;
  
  const metadata = source.metadata as any;
  const spaceSavedKB = Math.round((compressionInfo.spaceSaved || 0) / 1024);
  
  // Determine optimization level based on compression ratio and method
  let optimizationLevel: 'basic' | 'advanced' | 'maximum' = 'basic';
  if (compressionInfo.ratio < 0.3) optimizationLevel = 'maximum';
  else if (compressionInfo.ratio < 0.5) optimizationLevel = 'advanced';
  
  return {
    method: compressionInfo.method || 'standard',
    processingMode: compressionInfo.processingMode || 'chunking',
    spaceSavedKB,
    optimizationLevel
  };
};

// New: Format compression efficiency display
export const formatCompressionEfficiency = (source: AgentSource): string | null => {
  const details = getAdvancedCompressionDetails(source);
  const savings = getCompressionSavings(source);
  
  if (!details || !savings) return null;
  
  const efficiency = savings >= 70 ? 'Excellent' : 
                    savings >= 50 ? 'Very Good' : 
                    savings >= 30 ? 'Good' : 'Standard';
  
  return `${efficiency} (${savings}% saved)`;
};

// New: Get compression method display name
export const getCompressionMethodDisplay = (method: string): string => {
  const methodMap: Record<string, string> = {
    'enhanced-gzip': 'Enhanced GZIP',
    'advanced': 'Advanced Compression',
    'enhanced-rle': 'Enhanced RLE',
    'gzip-dictionary': 'GZIP with Dictionary',
    'maximum': 'Maximum Efficiency',
    'standard': 'Standard',
    'none': 'Uncompressed'
  };
  
  return methodMap[method] || method;
};
