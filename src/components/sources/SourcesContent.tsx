
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TotalStatsSection from './TotalStatsSection';
import SourceSectionsDisplay from './SourceSectionsDisplay';
import { SourceType, AgentSource } from '@/types/rag';

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: Array<{
    type: SourceType;
    sources: AgentSource[];
  }>;
  currentTab?: string;
  sourcesLength: number;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab,
  sourcesLength
}) => {
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

        {totalSources === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No sources added yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourcesContent;
