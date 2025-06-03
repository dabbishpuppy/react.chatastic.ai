
import React from 'react';
import { Trash2, ExternalLink, RefreshCw, Eye, EyeOff, Edit2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentSource } from '@/types/rag';
import { useWebsiteSourceOperations } from './hooks/useWebsiteSourceOperations';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WebsiteSourceItemProps {
  source: AgentSource;
  onRefetch: () => void;
  onRemove: (sourceId: string) => void;
}

export const WebsiteSourceItem: React.FC<WebsiteSourceItemProps> = ({ 
  source, 
  onRefetch, 
  onRemove 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url);
  
  const { 
    handleEdit, 
    handleExclude, 
    handleDelete, 
    handleRecrawl,
    handleEnhancedRecrawl
  } = useWebsiteSourceOperations(onRefetch, onRemove);

  const handleSaveEdit = async () => {
    await handleEdit(source.id, editUrl);
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

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
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
                <p className="text-sm font-medium truncate">{source.title || source.url}</p>
                <p className="text-xs text-muted-foreground truncate">{source.url}</p>
              </div>
            )}
            
            {progress > 0 && progress < 100 && (
              <div className="mb-2">
                <Progress value={progress} className="w-full h-2" />
                <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
              </div>
            )}
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
                    onClick={() => handleExclude(source)}
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
                    onClick={() => handleRecrawl(source)}
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
                    onClick={() => handleDelete(source)}
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
      </CardContent>
    </Card>
  );
};
