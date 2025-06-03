
import React from 'react';
import { Trash2, ExternalLink, RefreshCw, Eye, EyeOff, Edit2, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentSource } from '@/types/rag';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { useWebsiteSourceOperations } from './hooks/useWebsiteSourceOperations';
import WebsiteSourceInfo from './components/WebsiteSourceInfo';

interface WebsiteSourceItemProps {
  source: AgentSource;
  childSources?: AgentSource[];
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  isSelected: boolean;
  onSelectionChange: (selected?: boolean) => void;
}

export const WebsiteSourceItem: React.FC<WebsiteSourceItemProps> = ({ 
  source, 
  childSources = [],
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  isSelected,
  onSelectionChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use the operations hook for enhanced recrawl
  const { handleEnhancedRecrawl } = useWebsiteSourceOperations(() => {}, () => {});

  const handleSaveEdit = async () => {
    await onEdit(source.id, editUrl);
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const progress = source.progress || 0;
  const linksCount = source.links_count || 0;
  const hasChildSources = childSources && childSources.length > 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
            />
            
            {/* Dropdown arrow - always visible but only functional when hasChildSources */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hasChildSources && setIsExpanded(!isExpanded)}
              className={`p-1 h-6 w-6 ${!hasChildSources ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={!hasChildSources}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(source.crawl_status)} text-white`}
                >
                  {getStatusText(source.crawl_status)}
                </Badge>
                
                {source.is_excluded && (
                  <Badge variant="secondary">
                    <EyeOff className="w-3 h-3 mr-1" />
                    Excluded
                  </Badge>
                )}
                
                {linksCount > 0 && (
                  <Badge variant="outline">
                    {linksCount} links
                  </Badge>
                )}
              </div>
              
              {isEditing ? (
                <div className="flex gap-2 mb-2">
                  <Input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mb-2">
                  {/* Use the WebsiteSourceInfo component for detailed information */}
                  <WebsiteSourceInfo
                    title={source.title}
                    url={source.url}
                    createdAt={source.created_at}
                    linksCount={linksCount}
                    lastCrawledAt={source.last_crawled_at}
                    crawlStatus={source.crawl_status}
                    metadata={source.metadata}
                    content={source.content}
                    childSources={childSources}
                    isChild={false}
                    totalContentSize={source.total_content_size}
                    compressedContentSize={source.compressed_content_size}
                    originalSize={source.original_size}
                    compressedSize={source.compressed_size}
                  />
                </div>
              )}
              
              {progress > 0 && progress < 100 && (
                <div className="mb-2">
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(source.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open URL</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit URL</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExclude(source)}
                  >
                    {source.is_excluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{source.is_excluded ? 'Include' : 'Exclude'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRecrawl(source)}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recrawl</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEnhancedRecrawl(source)}
                    className="text-blue-600"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enhanced Recrawl (Better Content Extraction)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(source)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Child Sources Section */}
        {hasChildSources && isExpanded && (
          <div className="mt-4 pl-8 border-l-2 border-gray-200">
            <div className="space-y-2">
              {childSources.map((childSource) => (
                <div key={childSource.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(childSource.crawl_status)} text-white text-xs`}
                    >
                      {getStatusText(childSource.crawl_status)}
                    </Badge>
                    
                    {childSource.is_excluded && (
                      <Badge variant="secondary" className="text-xs">
                        <EyeOff className="w-2 h-2 mr-1" />
                        Excluded
                      </Badge>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <WebsiteSourceInfo
                        title={childSource.title}
                        url={childSource.url}
                        createdAt={childSource.created_at}
                        lastCrawledAt={childSource.last_crawled_at}
                        crawlStatus={childSource.crawl_status}
                        metadata={childSource.metadata}
                        content={childSource.content}
                        isChild={true}
                        totalContentSize={childSource.total_content_size}
                        compressedContentSize={childSource.compressed_content_size}
                        originalSize={childSource.original_size}
                        compressedSize={childSource.compressed_size}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(childSource.url, '_blank')}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open URL</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExclude(childSource)}
                            className="h-6 w-6 p-0"
                          >
                            {childSource.is_excluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{childSource.is_excluded ? 'Include' : 'Exclude'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(childSource)}
                            className="h-6 w-6 p-0 text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
