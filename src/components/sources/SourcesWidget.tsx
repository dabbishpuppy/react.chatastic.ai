
import React, { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceType } from "@/types/rag";
import { useAgentSources } from "@/hooks/useAgentSources";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import TotalStatsSection from "./TotalStatsSection";
import SourceSectionsDisplay from "./SourceSectionsDisplay";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { sources: sourcesData, loading, error } = useAgentSources();
  const [realtimeSize, setRealtimeSize] = useState(0);

  console.log(`📊 SourcesWidget render: tab=${currentTab}, sources=${sourcesData.length}, loading=${loading}, error=${error}`);

  // Set up real-time subscription for content size updates
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`sources-size-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        () => {
          console.log('📡 Sources size update triggered');
          setRealtimeSize(Date.now()); // Force recalculation
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  // Calculate total stats and filter sources for display
  const { totalSources, totalSize, sourcesByType } = useMemo(() => {
    console.log(`🧮 Calculating stats for ${sourcesData.length} sources`);
    
    // For total stats calculation, include all sources
    let sourcesToCount = sourcesData;
    let sourcesToSize = sourcesData;
    
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
      sourcesToSize = sourcesData; // Include all for size calculation
      
      console.log(`🌐 Website tab stats: ${websiteParents.length} parents, ${websiteChildren.length} children, ${nonWebsiteSources.length} non-website`);
    }
    
    // Calculate total size including content from database and metadata
    const totalBytes = sourcesToSize.reduce((total, source) => {
      let sourceSize = 0;
      
      // Check for content in the source
      if (source.content) {
        sourceSize += new Blob([source.content]).size;
      }
      
      // Check for content size in metadata (for crawled sources)
      if (source.metadata?.content_size) {
        sourceSize += source.metadata.content_size;
      }
      
      // Check for total content size in metadata (for parent sources)
      if (source.metadata?.total_content_size) {
        sourceSize += source.metadata.total_content_size;
      }
      
      return total + sourceSize;
    }, 0);
    
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

  if (loading) {
    console.log('⏳ SourcesWidget showing loading state');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading sources...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.log('❌ SourcesWidget showing error state:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            Error loading sources: {error}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Please try refreshing the page
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('✅ SourcesWidget rendering normal content');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TotalStatsSection 
          totalSources={totalSources}
          totalSize={totalSize}
        />

        <SourceSectionsDisplay 
          sourcesByType={sourcesByType}
          displayMode={currentTab === 'website' ? 'crawl-links' : 'default'}
        />

        {sourcesData.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No sources added yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourcesWidget;
