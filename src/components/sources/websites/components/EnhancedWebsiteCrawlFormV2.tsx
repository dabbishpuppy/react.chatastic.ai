
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

interface EnhancedCrawlResult {
  parentSourceId: string;
  discoveredCount: number;
  spawnedJobs: number;
}

interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  maxPages: number;
  excludePaths: string[];
  includePaths: string[];
  respectRobots: boolean;
  enableCompression: boolean;
  enableDeduplication: boolean;
}

interface EnhancedWebsiteCrawlFormV2Props {
  onCrawlStarted: (parentSourceId: string) => void;
}

export const EnhancedWebsiteCrawlFormV2: React.FC<EnhancedWebsiteCrawlFormV2Props> = ({
  onCrawlStarted
}) => {
  const { agentId } = useParams();
  const { initiateCrawl, isLoading } = useEnhancedCrawl();
  
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(100);
  const [excludePaths, setExcludePaths] = useState([
    "/wp-json/*",
    "/wp-admin/*", 
    "/xmlrpc.php",
    "/checkout/*",
    "/cart/*",
    "/admin/*"
  ]);
  const [includePaths, setIncludePaths] = useState<string[]>([]);
  const [respectRobots, setRespectRobots] = useState(true);
  const [customerUsage, setCustomerUsage] = useState<any>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [robotsStatus, setRobotsStatus] = useState<any>(null);

  // Get customer usage and rate limits
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!agentId) return;

      try {
        // Get team_id from agent
        const { data: agent } = await supabase
          .from('agents')
          .select('team_id')
          .eq('id', agentId)
          .single();

        if (agent?.team_id) {
          const [usage, rateLimitCheck] = await Promise.all([
            ProductionRateLimiting.getCustomerUsage(agent.team_id),
            ProductionRateLimiting.checkRateLimit(agent.team_id, maxPages)
          ]);
          
          setCustomerUsage(usage);
          setRateLimitStatus(rateLimitCheck);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      }
    };

    fetchCustomerData();
  }, [agentId, maxPages]);

  // Check robots.txt when URL changes
  useEffect(() => {
    const checkRobots = async () => {
      if (!url || !respectRobots) {
        setRobotsStatus(null);
        return;
      }

      try {
        const result = await RobotsComplianceChecker.checkUrlAllowed(url, respectRobots);
        setRobotsStatus(result);
      } catch (error) {
        console.error('Error checking robots.txt:', error);
        setRobotsStatus({ allowed: true, reason: 'Check failed, defaulting to allowed' });
      }
    };

    const timeoutId = setTimeout(checkRobots, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [url, respectRobots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentId || !url) return;

    try {
      const result = await initiateCrawl({
        agentId,
        url,
        maxPages,
        excludePaths,
        includePaths,
        respectRobots,
        enableCompression: true,
        enableDeduplication: true
      });

      if (result?.parentSourceId) {
        onCrawlStarted(result.parentSourceId);
        
        // Reset form
        setUrl("");
        setMaxPages(100);
      }
    } catch (error) {
      console.error('Crawl submission failed:', error);
    }
  };

  const renderUsageStatus = () => {
    if (!customerUsage) return null;

    const { tier, quotas, usage } = customerUsage;
    
    const getUsageColor = (used: number, limit: number) => {
      const percentage = used / limit;
      if (percentage >= 0.9) return "text-red-600";
      if (percentage >= 0.7) return "text-yellow-600";
      return "text-green-600";
    };

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" />
            Usage & Limits ({tier.name.toUpperCase()} Plan)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Daily Pages</div>
              <div className={`font-semibold ${getUsageColor(usage.dailyPages, tier.pagesPerDay)}`}>
                {usage.dailyPages} / {tier.pagesPerDay}
              </div>
              <div className="text-xs text-gray-500">{quotas.dailyRemaining} remaining</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Hourly Pages</div>
              <div className={`font-semibold ${getUsageColor(usage.hourlyPages, tier.pagesPerHour)}`}>
                {usage.hourlyPages} / {tier.pagesPerHour}
              </div>
              <div className="text-xs text-gray-500">{quotas.hourlyRemaining} remaining</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Active Jobs</div>
              <div className={`font-semibold ${getUsageColor(usage.activeJobs, tier.concurrentJobs)}`}>
                {usage.activeJobs} / {tier.concurrentJobs}
              </div>
              <div className="text-xs text-gray-500">{quotas.concurrentRemaining} available</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Storage</div>
              <div className={`font-semibold ${getUsageColor(usage.storageUsedGB, tier.storageQuotaGB)}`}>
                {usage.storageUsedGB.toFixed(2)} / {tier.storageQuotaGB} GB
              </div>
              <div className="text-xs text-gray-500">{quotas.storageRemaining.toFixed(2)} GB remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRateLimitAlert = () => {
    if (!rateLimitStatus || rateLimitStatus.allowed) return null;

    return (
      <Alert className="mb-4" variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Rate Limit Exceeded:</strong> {rateLimitStatus.reason}
          {rateLimitStatus.retryAfter && (
            <div className="mt-1 text-sm">
              Try again in {Math.ceil(rateLimitStatus.retryAfter / 60)} minutes.
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  const renderRobotsAlert = () => {
    if (!robotsStatus) return null;

    if (!robotsStatus.allowed) {
      return (
        <Alert className="mb-4" variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Robots.txt Restriction:</strong> {robotsStatus.reason}
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!respectRobots}
                  onChange={(e) => setRespectRobots(!e.target.checked)}
                />
                Override robots.txt (not recommended)
              </label>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (robotsStatus.crawlDelay && robotsStatus.crawlDelay > 1000) {
      return (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Robots.txt specifies a {robotsStatus.crawlDelay / 1000}s crawl delay. 
            We'll respect this to be polite.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Enhanced Website Crawl
          <Badge variant="outline" className="ml-2">Production Ready</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderUsageStatus()}
        {renderRateLimitAlert()}
        {renderRobotsAlert()}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="maxPages">Max Pages to Crawl</Label>
            <Input
              id="maxPages"
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
              min={1}
              max={customerUsage?.tier.pagesPerDay || 1000}
              disabled={isLoading}
            />
            {customerUsage && maxPages > customerUsage.quotas.dailyRemaining && (
              <div className="text-sm text-red-600 mt-1">
                Exceeds daily quota. Max allowed: {customerUsage.quotas.dailyRemaining}
              </div>
            )}
          </div>

          <div>
            <Label>Exclude Paths (Pre-filled with common patterns)</Label>
            <div className="space-y-2">
              {excludePaths.map((path, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={path}
                    onChange={(e) => {
                      const newPaths = [...excludePaths];
                      newPaths[index] = e.target.value;
                      setExcludePaths(newPaths);
                    }}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExcludePaths(excludePaths.filter((_, i) => i !== index));
                    }}
                    disabled={isLoading}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExcludePaths([...excludePaths, ""])}
                disabled={isLoading}
              >
                Add Exclude Path
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="respectRobots"
              checked={respectRobots}
              onChange={(e) => setRespectRobots(e.target.checked)}
              disabled={isLoading}
            />
            <Label htmlFor="respectRobots">Respect robots.txt</Label>
            <Badge variant="outline" className="text-xs">Recommended</Badge>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !rateLimitStatus?.allowed || (!robotsStatus?.allowed && respectRobots)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Starting Enhanced Crawl...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Start Production Crawl
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
