
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const WebsiteSourcesLoading: React.FC = () => {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Website Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <Skeleton className="h-4 w-4 mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 ml-4" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default WebsiteSourcesLoading;
