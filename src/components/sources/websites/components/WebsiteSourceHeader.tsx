
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import WebsiteSourceInfo from './WebsiteSourceInfo';

interface WebsiteSourceHeaderProps {
  source: AgentSource;
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
  const isParentSource = !source.parent_source_id;

  return (
    <div className="flex items-start gap-3 flex-1">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelectionChange}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={editUrl}
              onChange={(e) => onEditUrlChange(e.target.value)}
              className="flex-1"
              placeholder="Enter website URL"
              autoFocus
            />
            <Button
              size="sm"
              onClick={onSaveEdit}
              className="h-8 w-8 p-0"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
        
        <WebsiteSourceInfo
          title={source.title}
          url={source.url}
          createdAt={source.created_at}
          linksCount={source.links_count}
          crawlStatus={source.crawl_status}
          metadata={source.metadata}
          isChild={!isParentSource}
          totalContentSize={source.total_content_size}
          compressedContentSize={source.compressed_content_size}
          source={source}
          sourceId={source.id}
        />
      </div>
    </div>
  );
};

export default WebsiteSourceHeader;
