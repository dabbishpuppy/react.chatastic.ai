
import { AgentSource } from '@/types/rag';

export const formatFileSize = (source: AgentSource) => {
  // For all source types, prioritize file_size (processed content size) from metadata
  if (source.metadata) {
    const metadata = source.metadata as any;
    if (metadata.file_size && typeof metadata.file_size === 'number') {
      const bytes = metadata.file_size;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
  }

  // For website sources with child content, check total_content_size
  if (source.source_type === 'website' && source.metadata) {
    const metadata = source.metadata as any;
    if (metadata.total_content_size && typeof metadata.total_content_size === 'number') {
      const bytes = metadata.total_content_size;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
  }

  // Fall back to content length calculation for all types
  if (!source.content) return '0 B';
  const bytes = new TextEncoder().encode(source.content).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
};
