
import { AgentSource } from '@/types/rag';

export const formatFileSize = (source: AgentSource): string => {
  let sizeInBytes = 0;

  // Handle different source types with priority for aggregated data
  if (source.source_type === 'website') {
    // For website sources, prioritize aggregated compressed size
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
    // For non-website sources, use file_size from metadata first
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

export const getCompressionInfo = (source: AgentSource): { ratio: number; originalSize: number; compressedSize: number } | null => {
  // Only show compression info for website sources that have compression data
  if (source.source_type !== 'website') {
    return null;
  }

  let originalSize = 0;
  let compressedSize = 0;
  let ratio = 0;

  // Get original size (uncompressed)
  if (source.total_content_size && source.total_content_size > 0) {
    originalSize = source.total_content_size;
  } else if (source.original_size && source.original_size > 0) {
    originalSize = source.original_size;
  }

  // Get compressed size
  if (source.compressed_content_size && source.compressed_content_size > 0) {
    compressedSize = source.compressed_content_size;
  } else if (source.compressed_size && source.compressed_size > 0) {
    compressedSize = source.compressed_size;
  }

  // Calculate ratio
  if (source.global_compression_ratio && source.global_compression_ratio > 0) {
    ratio = source.global_compression_ratio;
  } else if (source.compression_ratio && source.compression_ratio > 0) {
    ratio = source.compression_ratio;
  } else if (originalSize > 0 && compressedSize > 0) {
    ratio = compressedSize / originalSize;
  }

  // Only return if we have meaningful data
  if (originalSize > 0 && compressedSize > 0 && ratio > 0) {
    return { ratio, originalSize, compressedSize };
  }

  return null;
};
