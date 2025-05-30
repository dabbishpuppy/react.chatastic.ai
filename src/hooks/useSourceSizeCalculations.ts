
import { useMemo } from 'react';
import { AgentSource, SourceType } from '@/types/rag';

export const useSourceSizeCalculations = (sourcesData: AgentSource[], currentTab?: string, realtimeSize?: number) => {
  return useMemo(() => {
    console.log(`🧮 Calculating stats for ${sourcesData.length} sources`);
    
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
          // Use cached total if available
          sourceSize = source.metadata.total_content_size;
        } else if (source.content) {
          // Fallback to parent's own content
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

    // For total stats calculation, include all sources for counting
    let sourcesToCount = sourcesData;
    
    // For website tab in crawl-links mode, count only parent sources but size includes all
    if (currentTab === 'website') {
      const websiteParents = sourcesData.filter(source => 
        source.source_type === 'website' && !source.parent_source_id
      );
      const websiteChildren = sourcesData.filter(source => 
        source.source_type === 'website' && source.parent_source_id
      );
      const nonWebsiteSources = sourcesData.filter(source => source.source_type !== 'website');
      
      sourcesToCount = [...websiteParents, ...nonWebsiteSources];
      
      console.log(`🌐 Website tab stats: ${websiteParents.length} parents, ${websiteChildren.length} children, ${nonWebsiteSources.length} non-website`);
    }
    
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

    // Create source sections - always show all types for consistency
    const sourceTypes: SourceType[] = ['text', 'file', 'website', 'qa'];
    const sourcesByType = sourceTypes.map(type => {
      let sources;
      if (type === 'website' && currentTab === 'website') {
        // For website sources on website tab, only show parent sources
        sources = sourcesData.filter(source => 
          source.source_type === type && !source.parent_source_id
        );
      } else {
        // For all other cases, show all sources of that type
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
  }, [sourcesData, currentTab, realtimeSize]);
};
