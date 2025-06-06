
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnhancedWebsiteCrawlFormProps {
  onCrawlInitiated?: () => void;
}

const EnhancedWebsiteCrawlForm: React.FC<EnhancedWebsiteCrawlFormProps> = ({ 
  onCrawlInitiated 
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Enhanced Website Crawler</CardTitle>
        <p className="text-sm text-muted-foreground">
          This feature has been removed
        </p>
      </CardHeader>

      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Enhanced website crawling functionality is no longer available.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            You can still manage existing website sources from the sources list.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlForm;
