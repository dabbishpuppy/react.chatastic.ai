
import { AgentSource } from '@/types/rag';

export const formatFileSize = (source: AgentSource) => {
  // For Q&A sources, calculate size from content (answer only) or metadata
  if (source.source_type === 'qa') {
    // First check if metadata has file_size
    if (source.metadata) {
      const metadata = source.metadata as any;
      if (metadata.file_size && typeof metadata.file_size === 'number' && metadata.file_size > 0) {
        return formatBytes(metadata.file_size);
      }
    }
    
    // Calculate from content if available (content should be the answer only)
    if (source.content && source.content.length > 0) {
      // For Q&A sources, strip HTML to get plain text size of the answer
      const stripHtml = (htmlString: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = htmlString;
        return tmp.textContent || tmp.innerText || '';
      };
      
      const plainText = stripHtml(source.content);
      const bytes = new TextEncoder().encode(plainText).length;
      return formatBytes(bytes);
    }
    
    return '0 B';
  }

  // For website sources, prioritize aggregated and compressed content sizes
  if (source.source_type === 'website') {
    const metadata = source.metadata as any;
    
    // 1. Check for total compressed content size from child pages (parent sources)
    if (metadata?.total_content_size && typeof metadata.total_content_size === 'number' && metadata.total_content_size > 0) {
      const bytes = metadata.total_content_size;
      return formatBytes(bytes);
    }
    
    // 2. Check for compressed size from metadata (individual pages)
    if (metadata?.compressed_size && typeof metadata.compressed_size === 'number' && metadata.compressed_size > 0) {
      const bytes = metadata.compressed_size;
      return formatBytes(bytes);
    }
    
    // 3. Check for file_size (processed content size)
    if (metadata?.file_size && typeof metadata.file_size === 'number' && metadata.file_size > 0) {
      const bytes = metadata.file_size;
      return formatBytes(bytes);
    }
  }

  // For all other source types, prioritize file_size (processed content size) from metadata
  if (source.metadata) {
    const metadata = source.metadata as any;
    if (metadata.file_size && typeof metadata.file_size === 'number' && metadata.file_size > 0) {
      const bytes = metadata.file_size;
      return formatBytes(bytes);
    }
    
    // Check for compressed_size as fallback
    if (metadata.compressed_size && typeof metadata.compressed_size === 'number' && metadata.compressed_size > 0) {
      const bytes = metadata.compressed_size;
      return formatBytes(bytes);
    }
  }

  // Only fall back to raw content length if no compressed/processed size is available and content exists
  if (source.content && source.content.length > 0) {
    const bytes = new TextEncoder().encode(source.content).length;
    return formatBytes(bytes);
  }
  
  return '0 B';
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
};
