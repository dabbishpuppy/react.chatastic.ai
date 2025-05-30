
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TotalStatsSection from './TotalStatsSection';
import SourceTypeStatsSection from './SourceTypeStatsSection';

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: {
    text: number;
    file: number;
    website: number;
    qa: number;
  };
  currentTab?: string;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab
}) => {
  console.log('✅ SourcesWidget rendering with stats-only content');

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

        <SourceTypeStatsSection 
          sourcesByType={sourcesByType}
          currentTab={currentTab}
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
