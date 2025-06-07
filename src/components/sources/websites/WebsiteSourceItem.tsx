
import React, { useState } from 'react';
import { AgentSource } from '@/types/rag';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Eye, EyeOff, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WebsiteSourceStatus from './components/WebsiteSourceStatus';
import WebsiteSourceStatusBadges from './components/WebsiteSourceStatusBadges';
import WorkflowControls from '@/components/workflow/WorkflowControls';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';
import { formatDistanceToNow } from 'date-fns';

interface WebsiteSourceItemProps {
  source: AgentSource;
  childSources: AgentSource[];
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

export const WebsiteSourceItem: React.FC<WebsiteSourceItemProps> = ({
  source,
  childSources,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  isSelected,
  onSelectionChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url || '');
  const [showWorkflowControls, setShowWorkflowControls] = useState(false);

  const handleEdit = () => {
    if (isEditing) {
      onEdit(source.id, editUrl);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUrl(source.url || '');
  };

  const status = SimplifiedSourceStatusService.getSourceStatus(source);
  const buttonState = SimplifiedSourceStatusService.determineButtonState(source);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Card className="border border-gray-200 hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="mt-1"
          />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Title and URL */}
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Enter website URL"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleEdit}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {source.title || source.url || 'Untitled'}
                      </h3>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {source.url && (
                      <p className="text-sm text-gray-600 truncate">
                        {source.url}
                      </p>
                    )}
                  </div>
                )}

                {/* Status and metadata */}
                <div className="mt-3 space-y-2">
                  <WebsiteSourceStatusBadges
                    crawlStatus={status}
                    isExcluded={source.is_excluded || false}
                    linksCount={source.links_count || 0}
                    sourceId={source.id}
                    source={source}
                  />
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {source.links_count !== undefined && source.links_count > 0 && (
                      <span>{source.links_count} pages</span>
                    )}
                    <span>
                      Updated {formatDate(source.updated_at)}
                    </span>
                    {source.last_crawled_at && (
                      <span>
                        Crawled {formatDate(source.last_crawled_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Workflow Controls */}
                {showWorkflowControls && (
                  <div className="mt-3">
                    <WorkflowControls 
                      source={source}
                      onRefresh={() => {
                        // Trigger a refresh of the sources list
                        window.dispatchEvent(new CustomEvent('sourceUpdated'));
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowWorkflowControls(!showWorkflowControls)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {showWorkflowControls ? 'Hide' : 'Show'} Workflow Controls
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit URL
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => onExclude(source)}>
                    {source.is_excluded ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Include
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Exclude
                      </>
                    )}
                  </DropdownMenuItem>
                  
                  {buttonState.canRecrawl && (
                    <DropdownMenuItem onClick={() => onRecrawl(source)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Recrawl
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => onDelete(source)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
