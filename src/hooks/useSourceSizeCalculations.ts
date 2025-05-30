
import { useMemo } from 'react';
import { AgentSource, SourceType } from '@/types/rag';

export const useSourceSizeCalculations = (sourcesData: AgentSource[], currentTab?: string, realtimeSize?: number) => {
  return useMemo(() => {
    console.log(`🧮 Creating source sections for ${sourcesData.length} sources`);
    
    // For counting sources, use parent sources for websites, all others for non-website
    const sourcesToCount = sourcesData.filter(source => {
      if (source.source_type === 'website') {
        return !source.parent_source_id; // Only count parent website sources
      }
      return true; // Count all non-website sources
    });
    
    console.log(`📊 Counting ${sourcesToCount.length} sources for display`);
    
    // Note: We no longer calculate total size here since it comes from the RPC
    // This hook now focuses on organizing sources by type for display
    
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

    const result = {
      totalSources: sourcesToCount.length, // This will be overridden by RPC stats
      totalSize: "0 B", // This will be overridden by RPC stats
      sourcesByType
    };

    console.log(`📊 Source sections prepared:`, result);
    return result;
  }, [sourcesData, realtimeSize]); // Removed currentTab dependency to ensure consistency
};
