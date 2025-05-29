import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceType } from "@/types/rag";
import { useAgentSources } from "@/hooks/useAgentSources";
import TotalStatsSection from "./TotalStatsSection";
import SourceSectionsDisplay from "./SourceSectionsDisplay";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { sources: sourcesData, loading } = useAgentSources();

  // Calculate total stats and filter sources for display
  const { totalSources, totalSize, sourcesByType } = useMemo(() => {
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
    }
    
    const totalBytes = sourcesToSize.reduce((total, source) => {
      if (!source.content) return total;
      return total + new Blob([source.content]).size;
    }, 0);
    
    let formattedTotalSize;
    if (totalBytes < 1024) formattedTotalSize = `${totalBytes} B`;
    else if (totalBytes < 1024 * 1024) formattedTotalSize = `${Math.round(totalBytes / 1024)} KB`;
    else formattedTotalSize = `${Math.round(totalBytes / (1024 * 1024))} MB`;

    // Create source sections - filter website sources for display but keep all others
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
      
      return { type, sources };
    });

    return {
      totalSources: sourcesToCount.length,
      totalSize: formattedTotalSize,
      sourcesByType
    };
  }, [sourcesData, currentTab]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

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
