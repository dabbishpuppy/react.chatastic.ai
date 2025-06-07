
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import WebsiteSourceInfo from './WebsiteSourceInfo';
import { useChildSourceSizeRealtime } from '../hooks/useChildSourceSizeRealtime';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  content_size?: number;
  chunks_created?: number;
  processing_time_ms?: number;
  parent_source_id: string;
}

interface WebsiteSourceHeaderProps {
  source: AgentSource;
  childSources: SourcePage[];
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
  childSources,
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

  // Use realtime hook for size calculations
  const { totalContentSize, compressedContentSize } = useChildSourceSizeRealtime({
    parentSourceId: source.id,
    initialChildSources: childSources
  });

  return (
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleSelectionChange}
        className="flex-shrink-0 mt-1"
      />
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editUrl}
              onChange={(e) => onEditUrlChange(e.target.value)}
              className="flex-1"
              placeholder="Enter website URL"
            />
            <Button 
              size="sm" 
              onClick={onSaveEdit}
              className="flex-shrink-0"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onCancelEdit}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <WebsiteSourceInfo
            title={source.title}
            url={source.url || ''}
            createdAt={source.created_at}
            linksCount={childSources.length}
            lastCrawledAt={source.last_crawled_at}
            crawlStatus={source.crawl_status}
            metadata={source.metadata}
            isChild={!!source.parent_source_id}
            totalContentSize={totalContentSize}
            compressedContentSize={compressedContentSize}
            source={source}
            sourceId={source.id}
            showStatusBadge={false}
          />
        )}
      </div>
    </div>
  );
};

export default WebsiteSourceHeader;
