
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  showFilters: boolean;
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
  showFilters
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [maxPages, setMaxPages] = useState(100); // Updated default
  const [maxDepth, setMaxDepth] = useState(3); // Updated default
  const [concurrency, setConcurrency] = useState(2); // Updated default

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      maxPages,
      maxDepth,
      concurrency
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Select value={protocol} onValueChange={setProtocol}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="https://">https://</SelectItem>
            <SelectItem value="http://">http://</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          type="text"
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
          required
        />
      </div>

      {showFilters && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="includePaths">Include paths (optional)</Label>
              <Input
                id="includePaths"
                type="text"
                placeholder="/blog, /docs"
                value={includePaths}
                onChange={(e) => setIncludePaths(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Comma-separated paths to include
              </p>
            </div>
            
            <div>
              <Label htmlFor="excludePaths">Exclude paths (optional)</Label>
              <Input
                id="excludePaths"
                type="text"
                placeholder="/admin, /private"
                value={excludePaths}
                onChange={(e) => setExcludePaths(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Comma-separated paths to exclude
              </p>
            </div>
          </div>

          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              {isAdvancedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Advanced Crawl Settings
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxPages">Max Pages</Label>
                  <Input
                    id="maxPages"
                    type="number"
                    min="1"
                    max="500"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum pages to crawl (1-500)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="maxDepth">Max Depth</Label>
                  <Input
                    id="maxDepth"
                    type="number"
                    min="1"
                    max="5"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value) || 3)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How deep to crawl (1-5)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="concurrency">Concurrency</Label>
                  <Input
                    id="concurrency"
                    type="number"
                    min="1"
                    max="3"
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value) || 2)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Simultaneous requests (1-3)
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Processing...' : buttonText}
      </Button>
    </form>
  );
};

export default WebsiteCrawlForm;
