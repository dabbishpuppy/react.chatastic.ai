
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  File, 
  Link, 
  MessageCircleQuestion,
  Info,
  Filter,
  CheckCircle2
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SourceType, AgentSource } from "@/types/rag";
import { formatDistanceToNow } from "date-fns";

interface SourceSectionsDisplayProps {
  sourcesByType: Array<{
    type: SourceType;
    sources: AgentSource[];
  }>;
  displayMode?: 'crawl-links' | 'default';
}

const SourceSectionsDisplay: React.FC<SourceSectionsDisplayProps> = React.memo(({ 
  sourcesByType,
  displayMode = 'default'
}) => {
  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'text':
        return <FileText size={16} className="text-blue-600" />;
      case 'file':
        return <File size={16} className="text-green-600" />;
      case 'website':
        return <Link size={16} className="text-purple-600" />;
      case 'qa':
        return <MessageCircleQuestion size={16} className="text-orange-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getSourceTypeLabel = (type: SourceType) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'file':
        return 'File';
      case 'website':
        return 'Website';
      case 'qa':
        return 'Q&A';
      default:
        return type;
    }
  };

  const formatFileSize = (content?: string) => {
    if (!content) return '0 B';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const getDisplayTitle = (source: AgentSource) => {
    if (source.source_type === 'website' && source.url) {
      if (displayMode === 'crawl-links') {
        try {
          const urlObj = new URL(source.url);
          return urlObj.hostname.replace(/^www\./, '');
        } catch {
          return source.url;
        }
      }
      return source.url;
    }
    return source.title;
  };

  const getFullUrl = (source: AgentSource) => {
    if (source.source_type === 'website' && source.url) {
      return source.url;
    }
    return source.title;
  };

  const getCrawlStats = (source: AgentSource) => {
    return source.metadata?.crawl_stats || source.metadata?.last_crawl_summary;
  };

  const renderCrawlStats = (source: AgentSource) => {
    const stats = getCrawlStats(source);
    if (!stats) return null;

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
        <div className="flex items-center space-x-1 mb-1">
          <Filter size={12} className="text-blue-500" />
          <span className="font-medium text-gray-700">Crawl Results</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-gray-600">
          <div>URLs Found: <span className="font-medium">{stats.urls_discovered || stats.total_urls || 0}</span></div>
          <div>Pages Visited: <span className="font-medium">{stats.pages_visited || 0}</span></div>
          {stats.links_filtered > 0 && (
            <div className="col-span-2">
              Filtered: <span className="font-medium text-orange-600">{stats.links_filtered}</span>
              <span className="text-gray-500 ml-1">(non-customer pages)</span>
            </div>
          )}
        </div>
        {stats.filter_reasons && Object.keys(stats.filter_reasons).length > 0 && (
          <div className="mt-1 pt-1 border-t border-gray-200">
            <div className="text-gray-500">Top filter reasons:</div>
            {Object.entries(stats.filter_reasons)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 2)
              .map(([reason, count]) => (
                <div key={reason} className="text-gray-600">
                  • {reason}: {count as number}
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {sourcesByType.map(({ type, sources }) => {
        if (sources.length === 0) return null;

        return (
          <div key={type} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getSourceIcon(type)}
                <span className="font-medium">{getSourceTypeLabel(type)}</span>
                <Badge variant="secondary" className="text-xs">
                  {sources.length}
                </Badge>
                {type === 'website' && displayMode === 'crawl-links' && (
                  <Badge variant="outline" className="text-xs flex items-center space-x-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Filtered</span>
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              {sources.slice(0, 3).map((source) => (
                <div key={source.id} className="border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="truncate" title={getFullUrl(source)}>
                        {getDisplayTitle(source)}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info size={12} className="text-gray-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="font-medium">URL:</span>
                              <div className="text-gray-600 break-all">
                                {getFullUrl(source)}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Created:</span>
                              <div className="text-gray-600">
                                {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Last updated:</span>
                              <div className="text-gray-600">
                                {formatDistanceToNow(new Date(source.updated_at), { addSuffix: true })}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Size:</span>
                              <div className="text-gray-600">{formatFileSize(source.content)}</div>
                            </div>
                            <div>
                              <span className="font-medium">Status:</span>
                              <div className="text-gray-600">
                                {source.is_active ? 'Active' : 'Inactive'}
                              </div>
                            </div>
                            {source.source_type === 'website' && source.metadata?.validation_passed && (
                              <div>
                                <span className="font-medium">Validation:</span>
                                <div className="text-green-600 flex items-center space-x-1">
                                  <CheckCircle2 size={12} />
                                  <span>Customer-facing page</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {formatFileSize(source.content)}
                    </span>
                  </div>
                  
                  {/* Show crawl statistics for parent website sources */}
                  {source.source_type === 'website' && !source.parent_source_id && renderCrawlStats(source)}
                </div>
              ))}
              
              {sources.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{sources.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

SourceSectionsDisplay.displayName = 'SourceSectionsDisplay';

export default SourceSectionsDisplay;
