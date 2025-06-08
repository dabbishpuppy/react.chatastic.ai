import React, { useState } from 'react';
import { AgentSource } from '@/types/rag';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Eye, EyeOff, Trash2, RotateCcw, ExternalLink, ChevronDown, ChevronRight, Calendar, Link, Database } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import WebsiteSourceStatus from './components/WebsiteSourceStatus';
import WebsiteSourceStatusBadges from './components/WebsiteSourceStatusBadges';
import WebsiteChildSources from './components/WebsiteChildSources';
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
  const [isChildSourcesOpen, setIsChildSourcesOpen] = useState(false);

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
    
    // DEBUG: Log the raw date values
    console.log('🐛 DEBUG formatDate - Raw dateString:', JSON.stringify(dateString));
    console.log('🐛 DEBUG formatDate - Type:', typeof dateString);
    console.log('🐛 DEBUG formatDate - Length:', dateString.length);
    
    try {
      const parsedDate = new Date(dateString);
      console.log('🐛 DEBUG formatDate - Parsed date:', parsedDate);
      console.log('🐛 DEBUG formatDate - Is valid:', !isNaN(parsedDate.getTime()));
      
      const formatted = formatDistanceToNow(parsedDate, { addSuffix: true });
      console.log('🐛 DEBUG formatDate - Formatted result:', JSON.stringify(formatted));
      
      return formatted;
    } catch (error) {
      console.error('🐛 DEBUG formatDate - Error:', error);
      return 'Invalid date';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = bytes / Math.pow(k, i);
    const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
    
    return `${formattedSize} ${sizes[i]}`;
  };

  // Check if source has potential child sources based on links_count OR if it's a website source that could have children
  const hasChildSources = (source.links_count || 0) > 0 || 
    (source.source_type === 'website' && (status === 'in_progress' || status === 'trained'));

  // Calculate total child source sizes for trained sources
  const totalChildSize = React.useMemo(() => {
    if (status === 'trained' && childSources.length > 0) {
      return childSources.reduce((total, child) => {
        return total + (child.total_content_size || 0);
      }, 0);
    }
    return 0;
  }, [status, childSources]);

  // DEBUG: Log source data to identify the extra "0"
  console.log('🐛 DEBUG WebsiteSourceItem - Source data:', {
    id: source.id,
    title: source.title,
    url: source.url,
    last_crawled_at: JSON.stringify(source.last_crawled_at),
    updated_at: JSON.stringify(source.updated_at),
    created_at: JSON.stringify(source.created_at)
  });

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-3 p-3 hover:bg-gray-50">
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
              {/* Title only */}
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
                    <h3 className="font-medium text-gray-900 truncate text-sm">
                      {source.title || source.url || 'Untitled'}
                    </h3>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata with icons */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {/* 1. Crawled time first with Calendar icon */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Crawled {formatDate(source.last_crawled_at || source.updated_at)}</span>
                  </div>
                  
                  {/* 2. Links count with Link icon */}
                  {source.links_count !== undefined && source.links_count > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Link className="w-3 h-3" />
                        <span>{source.links_count} links</span>
                      </div>
                    </>
                  )}

                  {/* 3. Child source sizes for trained sources with Database icon */}
                  {status === 'trained' && totalChildSize > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        <span>{formatBytes(totalChildSize)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status badges and actions */}
            <div className="flex items-center gap-2">
              {/* Status badges */}
              <WebsiteSourceStatusBadges
                crawlStatus={status}
                isExcluded={source.is_excluded || false}
                linksCount={source.links_count || 0}
                sourceId={source.id}
                source={source}
              />

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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

              {/* Child sources toggle - moved to right side of actions */}
              {hasChildSources && (
                <Collapsible open={isChildSourcesOpen} onOpenChange={setIsChildSourcesOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isChildSourcesOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible child sources (without the "Child Pages" text) */}
      {hasChildSources && (
        <Collapsible open={isChildSourcesOpen} onOpenChange={setIsChildSourcesOpen}>
          <CollapsibleContent>
            <div className="ml-6 mr-3 mb-3">
              <WebsiteChildSources
                parentSourceId={source.id}
                isCrawling={status === 'in_progress'}
                onEdit={onEdit}
                onExclude={onExclude}
                onDelete={onDelete}
                onRecrawl={onRecrawl}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
