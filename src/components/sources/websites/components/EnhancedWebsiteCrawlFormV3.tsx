
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { useProductionInfrastructure } from '@/hooks/useProductionInfrastructure';
import { Globe, FileText, Map, AlertCircle } from 'lucide-react';

interface EnhancedWebsiteCrawlFormV3Props {
  onCrawlStarted?: (parentSourceId: string) => void;
}

const EnhancedWebsiteCrawlFormV3: React.FC<EnhancedWebsiteCrawlFormV3Props> = ({
  onCrawlStarted
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Enhanced Website Crawl
          <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">Feature Removed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            Enhanced website crawling functionality has been removed.
          </p>
          <p className="text-sm text-muted-foreground">
            You can still manage existing website sources from the sources list.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlFormV3;
