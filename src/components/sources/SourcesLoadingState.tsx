
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SourcesLoadingState: React.FC = () => {
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
};

export default SourcesLoadingState;
