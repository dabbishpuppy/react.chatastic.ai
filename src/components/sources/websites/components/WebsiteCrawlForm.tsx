
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Loader2 } from 'lucide-react';

interface WebsiteCrawlFormProps {
  url: string;
  setUrl: (url: string) => void;
  includePaths: string;
  setIncludePaths: (paths: string) => void;
  excludePaths: string;
  setExcludePaths: (paths: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  buttonText: string;
  showFilters?: boolean;
}

const WebsiteCrawlForm: React.FC<WebsiteCrawlFormProps> = ({
  url,
  setUrl,
  includePaths,
  setIncludePaths,
  excludePaths,
  setExcludePaths,
  onSubmit,
  isSubmitting,
  buttonText,
  showFilters = false
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <div className="flex">
          <div className="relative flex items-center min-w-[120px]">
            <select className="h-full rounded-l-md border border-r-0 border-gray-300 bg-white pl-3 pr-8 py-0 text-sm">
              <option>https://</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
              </svg>
            </div>
          </div>
          <Input 
            id="url" 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="www.example.com" 
            className="flex-1 rounded-l-none border-l-0" 
          />
        </div>
      </div>

      {showFilters && (
        <>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex items-start">
            <Info size={18} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              If you add multiple crawl links, they will all be marked as "pending" and will not overwrite one another.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="include-paths" className="block text-sm font-medium text-gray-700 mb-1">
                Include only paths
              </label>
              <Input 
                id="include-paths" 
                value={includePaths} 
                onChange={e => setIncludePaths(e.target.value)} 
                placeholder="Ex: blog/*, dev/*" 
              />
            </div>
            <div>
              <label htmlFor="exclude-paths" className="block text-sm font-medium text-gray-700 mb-1">
                Exclude paths
              </label>
              <Input 
                id="exclude-paths" 
                value={excludePaths} 
                onChange={e => setExcludePaths(e.target.value)} 
                placeholder="Ex: blog/*, dev/*" 
              />
            </div>
          </div>
        </>
      )}

      <div className="text-right">
        <Button 
          onClick={onSubmit} 
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
