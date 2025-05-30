
import { useMemo } from 'react';
import { AgentSource, SourceType } from '@/types/rag';

export const useSourceSizeCalculations = (sourcesData: AgentSource[], currentTab?: string, realtimeSize?: number) => {
  return useMemo(() => {
    console.log(`🧮 Calculating stats for ${sourcesData.length} total sources`);
    
    // Enhanced size calculation that properly handles website parent-child relationships
    const calculateSourceSize = (source: any, allSources: any[]) => {
      let sourceSize = 0;
      
      // If this is a website parent source, calculate total from all its children
      if (source.source_type === 'website' && !source.parent_source_id) {
        const childSources = allSources.filter(s => 
          s.source_type === 'website' && s.parent_source_id === source.id
        );
        
        if (childSources.length > 0) {
          sourceSize = childSources.reduce((total, child) => {
            let childSize = 0;
            
            if (child.content) {
              childSize += new Blob([child.content]).size;
            }
            
            if (child.metadata?.content_size) {
              childSize += child.metadata.content_size;
            }
            
            return total + childSize;
          }, 0);
        } else if (source.metadata?.total_content_size) {
          sourceSize = source.metadata.total_content_size;
        } else if (source.content) {
          sourceSize = new Blob([source.content]).size;
        }
      } else if (source.source_type !== 'website' || source.parent_source_id) {
        // For non-website sources or website child sources, use individual size
        if (source.content) {
          sourceSize += new Blob([source.content]).size;
        }
        
        if (source.metadata?.content_size) {
          sourceSize += source.metadata.content_size;
        }
        
        if (source.metadata?.total_content_size) {
          sourceSize += source.metadata.total_content_size;
        }
      }
      
      return sourceSize;
    };

    // For counting sources, use parent sources for websites, all others for non-website
    const sourcesToCount = sourcesData.filter(source => {
      if (source.source_type === 'website') {
        return !source.parent_source_id; // Only count parent website sources
      }
      return true; // Count all non-website sources
    });
    
    console.log(`📊 Counting ${sourcesToCount.length} sources (${sourcesData.length} total)`);
    
    // Calculate total size using enhanced calculation
    const totalBytes = sourcesToCount.reduce((total, source) => {
      const sourceSize = calculateSourceSize(source, sourcesData);
      console.log(`📏 Source ${source.title || source.url}: ${sourceSize} bytes`);
      return total + sourceSize;
    }, 0);
    
    console.log(`📊 Total calculated size: ${totalBytes} bytes`);
    
    let formattedTotalSize;
    if (totalBytes < 1024) formattedTotalSize = `${totalBytes} B`;
    else if (totalBytes < 1024 * 1024) formattedTotalSize = `${Math.round(totalBytes / 1024)} KB`;
    else formattedTotalSize = `${Math.round(totalBytes / (1024 * 1024))} MB`;

    // Create source sections - ALWAYS show all types regardless of current tab
    const sourceTypes: SourceType[] = ['text', 'file', 'website', 'qa'];
    const sourcesByType = sourceTypes.map(type => {
      let sources;
      if (type === 'website') {
        // For website sources, only show parent sources in the widget
        sources = sourcesData.filter(source => 
          source.source_type === type && !source.parent_source_id
        );
      } else {
        // For all other types, show all sources
        sources = sourcesData.filter(source => source.source_type === type);
      }
      
      console.log(`📝 Type ${type}: ${sources.length} sources`);
      return { type, sources };
    });

    const stats = {
      totalSources: sourcesToCount.length,
      totalSize: formattedTotalSize,
      sourcesByType
    };

    console.log(`📊 Final stats:`, stats);
    return stats;
  }, [sourcesData, realtimeSize]); // Removed currentTab dependency to ensure consistency
};
