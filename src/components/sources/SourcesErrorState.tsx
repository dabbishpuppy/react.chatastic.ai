
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SourcesErrorStateProps {
  error: string;
}

const SourcesErrorState: React.FC<SourcesErrorStateProps> = ({ error }) => {
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
};

export default SourcesErrorState;
