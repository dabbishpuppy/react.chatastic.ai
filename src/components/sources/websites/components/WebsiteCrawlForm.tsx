
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Info, Loader2, HelpCircle, CheckCircle2, AlertCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

interface WebsiteCrawlFormProps {
  url: string;
  setUrl: (url: string) => void;
  protocol: string;
  setProtocol: (protocol: string) => void;
  includePaths: string;
  setIncludePaths: (paths: string) => void;
  excludePaths: string;
  setExcludePaths: (paths: string) => void;
  onSubmit: (options?: { maxPages?: number; maxDepth?: number; concurrency?: number }) => void;
  isSubmitting: boolean;
  buttonText: string;
  showFilters?: boolean;
}

const WebsiteCrawlForm: React.FC<WebsiteCrawlFormProps> = ({
  url,
  setUrl,
  protocol,
  setProtocol,
  includePaths,
  setIncludePaths,
  excludePaths,
  setExcludePaths,
  onSubmit,
  isSubmitting,
  buttonText,
  showFilters = false
}) => {
  const [showPatternHelp, setShowPatternHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPages, setMaxPages] = useState(1000);
  const [maxDepth, setMaxDepth] = useState(10);
  const [concurrency, setConcurrency] = useState(5);

  const patternExamples = {
    include: [
      '/blog/*',
      '/products/*',
      '/services/*',
      '/about*',
      '/contact*'
    ],
    exclude: [
      '/admin/*',
      '/wp-admin/*',
      '/login*',
      '/dashboard/*',
      '/api/*',
      '*.pdf',
      '*.json'
    ]
  };

  const validatePatterns = (patterns: string) => {
    if (!patterns.trim()) return { valid: true, count: 0 };
    
    const lines = patterns.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    return { valid: true, count: lines.length };
  };

  const includeValidation = validatePatterns(includePaths);
  const excludeValidation = validatePatterns(excludePaths);

  const handleSubmit = () => {
    const options = showAdvanced ? {
      maxPages,
      maxDepth,
      concurrency
    } : undefined;
    
    onSubmit(options);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <div className="flex">
          <Select value={protocol} onValueChange={setProtocol}>
            <SelectTrigger className="w-32 rounded-r-none border-r-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="https://">https://</SelectItem>
              <SelectItem value="http://">http://</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            id="url" 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="www.example.com" 
            className="flex-1 rounded-l-none border-l-0" 
          />
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center">
              <Settings size={16} className="mr-2" />
              Advanced Crawl Settings
            </div>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <div className="flex items-start">
              <Info size={18} className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Crawl Limits Configuration</p>
                <p>Adjust these settings to control the scope and speed of your website crawl. Higher values will crawl more pages but take longer.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="max-pages" className="text-sm font-medium">
                Max Pages
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        id="max-pages"
                        type="number"
                        value={maxPages}
                        onChange={e => setMaxPages(parseInt(e.target.value) || 1000)}
                        min="1"
                        max="10000"
                        className="mt-1"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum number of pages to crawl (1-10,000)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="text-xs text-gray-500 mt-1">Default: 1,000</p>
            </div>

            <div>
              <Label htmlFor="max-depth" className="text-sm font-medium">
                Max Depth
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        id="max-depth"
                        type="number"
                        value={maxDepth}
                        onChange={e => setMaxDepth(parseInt(e.target.value) || 10)}
                        min="1"
                        max="20"
                        className="mt-1"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>How many clicks away from start URL to crawl (1-20)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="text-xs text-gray-500 mt-1">Default: 10</p>
            </div>

            <div>
              <Label htmlFor="concurrency" className="text-sm font-medium">
                Concurrency
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        id="concurrency"
                        type="number"
                        value={concurrency}
                        onChange={e => setConcurrency(parseInt(e.target.value) || 5)}
                        min="1"
                        max="20"
                        className="mt-1"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of pages to crawl simultaneously (1-20)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="text-xs text-gray-500 mt-1">Default: 5</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <div className="flex items-start">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Performance Note:</p>
                <p className="mt-1">
                  Higher concurrency crawls faster but uses more resources. 
                  Very high page limits may take significant time to complete.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showFilters && (
        <>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <div className="flex items-start">
              <Info size={18} className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Enhanced Customer-Facing Crawling</p>
                <p>This crawler automatically filters out admin pages, API endpoints, and non-customer content. Only public-facing pages will be indexed.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Advanced Filtering</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPatternHelp(!showPatternHelp)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <HelpCircle size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click for pattern examples and help</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {showPatternHelp && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Include Examples:</h5>
                    <ul className="space-y-1 text-gray-600">
                      {patternExamples.include.map((example, i) => (
                        <li key={i} className="font-mono text-xs bg-white px-2 py-1 rounded">
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Exclude Examples:</h5>
                    <ul className="space-y-1 text-gray-600">
                      {patternExamples.exclude.map((example, i) => (
                        <li key={i} className="font-mono text-xs bg-white px-2 py-1 rounded">
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-gray-600">
                    <strong>Pattern Tips:</strong> Use * for wildcards, start with / for paths, 
                    use *.ext for file extensions. One pattern per line.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="include-paths" className="block text-sm font-medium text-gray-700">
                    Include only paths
                  </label>
                  <div className="flex items-center space-x-1">
                    {includeValidation.valid ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <AlertCircle size={14} className="text-red-500" />
                    )}
                    <span className="text-xs text-gray-500">
                      {includeValidation.count} patterns
                    </span>
                  </div>
                </div>
                <Textarea
                  id="include-paths"
                  value={includePaths}
                  onChange={e => setIncludePaths(e.target.value)}
                  placeholder="e.g.&#10;/blog/*&#10;/products/*&#10;/services/*"
                  className="text-sm font-mono"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to include all paths (recommended)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="exclude-paths" className="block text-sm font-medium text-gray-700">
                    Exclude paths
                  </label>
                  <div className="flex items-center space-x-1">
                    {excludeValidation.valid ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <AlertCircle size={14} className="text-red-500" />
                    )}
                    <span className="text-xs text-gray-500">
                      {excludeValidation.count} patterns
                    </span>
                  </div>
                </div>
                <Textarea
                  id="exclude-paths"
                  value={excludePaths}
                  onChange={e => setExcludePaths(e.target.value)}
                  placeholder="e.g.&#10;/private/*&#10;/temp/*&#10;*.pdf"
                  className="text-sm font-mono"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional patterns beyond default excludes
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
              <div className="flex items-start">
                <Info size={16} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Automatic Filtering Applied:</p>
                  <p className="mt-1">
                    Admin pages, login areas, API endpoints, file downloads, and other 
                    non-customer content are automatically excluded to ensure only 
                    relevant pages are indexed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="text-right">
        <Button 
          onClick={handleSubmit} 
          className="bg-gray-800 hover:bg-gray-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : buttonText}
        </Button>
      </div>
    </div>
  );
};

export default WebsiteCrawlForm;
