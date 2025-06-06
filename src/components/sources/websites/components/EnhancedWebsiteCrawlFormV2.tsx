
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEnhancedCrawl } from "@/hooks/useEnhancedCrawl";
import { ProductionRateLimiting } from "@/services/rag/enhanced/productionRateLimiting";
import { RobotsComplianceChecker } from "@/services/rag/enhanced/robotsCompliance";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Globe, 
  Settings, 
  Shield,
  Zap,
  TrendingUp
} from "lucide-react";

interface EnhancedWebsiteCrawlFormV2Props {
  onCrawlStarted?: (parentSourceId: string) => void;
}

export const EnhancedWebsiteCrawlFormV2: React.FC<EnhancedWebsiteCrawlFormV2Props> = ({
  onCrawlStarted
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Enhanced Website Crawl
          <Badge variant="outline" className="ml-2">Feature Removed</Badge>
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
