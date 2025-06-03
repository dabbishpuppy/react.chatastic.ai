
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import WebsiteSourceInfo from './WebsiteSourceInfo';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';

interface WebsiteSourceHeaderProps {
  source: AgentSource;
  childSources: AgentSource[];
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
  const progress = source.progress || 0;
  const linksCount = source.links_count || 0;
  const isCrawling = source.crawl_status === 'in_progress';

  return (
    <div className="flex items-center gap-3 flex-1">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelectionChange}
      />
      
      {/* Show loader when crawling is in progress */}
      {isCrawling && (
        <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <WebsiteSourceStatusBadges
          crawlStatus={source.crawl_status}
          isExcluded={source.is_excluded}
          linksCount={linksCount}
          progress={progress}
        />
        
        {isEditing ? (
          <div className="flex gap-2 mb-2">
            <Input
              value={editUrl}
              onChange={(e) => onEditUrlChange(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={onSaveEdit}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="mb-2">
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
      </div>
    </div>
  );
};

export default WebsiteSourceHeader;
