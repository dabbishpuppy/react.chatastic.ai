
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3 } from 'lucide-react';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import CrawlStatusBadge from './crawl-tracker/CrawlStatusBadge';
import CrawlProgressStats from './crawl-tracker/CrawlProgressStats';
import CompressionStatsDisplay from './crawl-tracker/CompressionStatsDisplay';
import FailedJobsPanel from './crawl-tracker/FailedJobsPanel';
import JobsList from './crawl-tracker/JobsList';

interface CrawlProgressTrackerProps {
  parentSourceId: string;
  onComplete?: () => void;
}

interface CrawlJob {
  id: string;
  url: string;
  status: string;
  error_message?: string;
}

const CrawlProgressTracker: React.FC<CrawlProgressTrackerProps> = ({
  parentSourceId,
  onComplete
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
          <p>Enhanced crawl functionality has been removed</p>
          <p className="text-sm mt-2">This feature is no longer available</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrawlProgressTracker;
