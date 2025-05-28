
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceType } from "@/types/rag";
import { useAgentSources } from "@/hooks/useAgentSources";
import TotalStatsSection from "./TotalStatsSection";
import SourceSectionsDisplay from "./SourceSectionsDisplay";

const SourcesWidget: React.FC = () => {
  const { sources: sourcesData, loading } = useAgentSources();

  // Memoize total stats separately - these will update when sources change
  const { totalSources, totalSize } = useMemo(() => {
    const totalBytes = sourcesData.reduce((total, source) => {
      if (!source.content) return total;
      return total + new Blob([source.content]).size;
    }, 0);
    
    let formattedTotalSize;
    if (totalBytes < 1024) formattedTotalSize = `${totalBytes} B`;
    else if (totalBytes < 1024 * 1024) formattedTotalSize = `${Math.round(totalBytes / 1024)} KB`;
    else formattedTotalSize = `${Math.round(totalBytes / (1024 * 1024))} MB`;

    return {
      totalSources: sourcesData.length,
      totalSize: formattedTotalSize
    };
  }, [sourcesData]);

  // Memoize source sections - these will only update when the actual source structure changes
  const sourcesByType = useMemo(() => {
    const sourceTypes: SourceType[] = ['text', 'file', 'website', 'qa'];
    return sourceTypes.map(type => ({
      type,
      sources: sourcesData.filter(source => source.source_type === type)
    }));
  }, [sourcesData]);

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
