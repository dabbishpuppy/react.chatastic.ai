
import React, { useState } from 'react';
import { AgentSource } from '@/types/rag';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight, 
  Globe, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ExternalLink,
  Edit2,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2
} from 'lucide-react';
import WebsiteChildSources from './components/WebsiteChildSources';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url || '');

  console.log('🐛 DEBUG WebsiteSourceItem - Source data:', {
    id: source.id,
    title: source.title,
    url: source.url,
    last_crawled_at: JSON.stringify(source.last_crawled_at),
    updated_at: JSON.stringify(source.updated_at),
    created_at: JSON.stringify(source.created_at)
  });

  const formatDate = (dateString: string | null | undefined) => {
    console.log('🐛 DEBUG formatDate - Raw dateString:', JSON.stringify(dateString));
    console.log('🐛 DEBUG formatDate - Type:', typeof dateString);
    console.log('🐛 DEBUG formatDate - Length:', dateString?.length);
    
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      console.log('🐛 DEBUG formatDate - Parsed date:', {
        date,
        isValid: !isNaN(date.getTime()),
        iso: date.toISOString()
      });
      
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let result;
      if (diffMins < 1) {
        result = 'Just now';
      } else if (diffMins < 60) {
        result = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        result = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        result = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        result = date.toLocaleDateString();
      }
      
      console.log('🐛 DEBUG formatDate - Formatted result:', result);
      return result;
    } catch (error) {
      console.error('🐛 DEBUG formatDate - Error:', error);
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'trained':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
      case 'crawling':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Globe className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'trained': return 'Trained';
      case 'in_progress': return 'In Progress';
      case 'crawling': return 'Crawling';
      case 'failed': return 'Failed';
      case 'error': return 'Error';
      case 'pending': return 'Pending';
      default: return status || 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'trained':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
      case 'crawling':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSaveEdit = () => {
    if (editUrl.trim() && editUrl !== source.url) {
      onEdit(source.id, editUrl.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditUrl(source.url || '');
    setIsEditing(false);
  };

  const displayUrl = source.url || source.title || 'No URL';
  const hasChildren = childSources.length > 0;

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
            />
            
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 h-auto"
              >
                {isExpanded ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronRight className="w-4 h-4" />
                }
              </Button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(source.crawl_status || 'pending')}
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(source.crawl_status || 'pending')}`}
                >
                  {getStatusText(source.crawl_status || 'pending')}
                </Badge>
                {source.is_excluded && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="w-2 h-2 mr-1" />
                    Excluded
                  </Badge>
                )}
                {hasChildren && (
                  <Badge variant="outline" className="text-xs">
                    {childSources.length} pages
                  </Badge>
                )}
              </div>
              
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                </div>
              ) : (
                <>
                  <p className="font-medium text-gray-900 truncate" title={displayUrl}>
                    {source.title || displayUrl}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {displayUrl}
                  </p>
                  <p className="text-xs text-gray-400">
                    Updated {formatDate(source.updated_at)}
                    {source.last_crawled_at && ` • Last crawled ${formatDate(source.last_crawled_at)}`}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(displayUrl, '_blank')}
              className="h-8 w-8 p-0"
              title="Open URL"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
              title="Edit URL"
            >
              <Edit2 className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExclude(source)}
              className="h-8 w-8 p-0"
              title={source.is_excluded ? 'Include' : 'Exclude'}
            >
              {source.is_excluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRecrawl(source)}
              className="h-8 w-8 p-0"
              title="Recrawl"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(source)}
              className="h-8 w-8 p-0 text-red-600"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-4">
            <WebsiteChildSources
              parentSourceId={source.id}
              isCrawling={source.crawl_status === 'in_progress' || source.crawl_status === 'crawling'}
              onEdit={onEdit}
              onExclude={onExclude}
              onDelete={onDelete}
              onRecrawl={onRecrawl}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
