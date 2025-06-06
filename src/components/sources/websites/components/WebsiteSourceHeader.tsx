
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';

interface WebsiteSourceHeaderProps {
  source: any;
  childSources?: any[];
  isSelected: boolean;
  isEditing: boolean;
  editUrl: string;
  onSelectionChange: (selected?: boolean) => void;
  onEditUrlChange: (url: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

const WebsiteSourceHeader: React.FC<WebsiteSourceHeaderProps> = ({
  source,
  childSources = [],
  isSelected,
  isEditing,
  editUrl,
  onSelectionChange,
  onEditUrlChange,
  onSaveEdit,
  onCancelEdit
}) => {
  const handleSelectionChange = (checked: boolean) => {
    onSelectionChange(checked);
  };

  const isParentSource = !source.parent_source_id;
  const hasChildren = childSources && childSources.length > 0;

  return (
    <div className="flex items-center space-x-4">
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleSelectionChange}
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <WebsiteSourceStatusBadges
            crawlStatus={source.crawl_status}
            isExcluded={source.is_excluded}
            linksCount={source.links_count || 0}
            progress={source.progress}
            sourceId={source.id}
            sourceData={source}
            isChildSource={false}
          />
          
          {hasChildren && (
            <span className="text-sm text-gray-500">
              {childSources.length} pages
            </span>
          )}
        </div>
        
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <Input
              value={editUrl}
              onChange={(e) => onEditUrlChange(e.target.value)}
              className="flex-1"
              placeholder="Enter website URL"
            />
            <Button size="sm" onClick={onSaveEdit}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <div className="font-medium text-sm">{source.title}</div>
            <div className="text-sm text-gray-600 truncate" title={source.url}>
              {source.url}
            </div>
            {source.progress > 0 && source.crawl_status === 'in_progress' && (
              <div className="text-xs text-gray-500 mt-1">
                Progress: {source.progress}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteSourceHeader;
