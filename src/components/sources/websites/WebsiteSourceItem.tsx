
import React, { useState } from 'react';
import { AgentSource } from '@/types/rag';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import WebsiteSourceStatusBadges from './components/WebsiteSourceStatusBadges';
import WebsiteChildSources from './components/WebsiteChildSources';
import { WebsiteSourceHeader } from './components/WebsiteSourceHeader';
import { WebsiteSourceMetadata } from './components/WebsiteSourceMetadata';
import { WebsiteSourceActions } from './components/WebsiteSourceActions';
import { WebsiteSourceToggle } from './components/WebsiteSourceToggle';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';

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
  const [isChildSourcesOpen, setIsChildSourcesOpen] = useState(false);

  const status = SimplifiedSourceStatusService.getSourceStatus(source);
  const buttonState = SimplifiedSourceStatusService.determineButtonState(source);

  const handleEditHeader = () => {
    // This will be handled by the WebsiteSourceHeader component internally
  };

  // Improved crawling detection
  const isCrawling = status === 'in_progress' || 
                     status === 'pending' || 
                     source.crawl_status === 'in_progress' || 
                     source.crawl_status === 'pending' ||
                     source.workflow_status === 'CRAWLING';

  console.log('🐛 DEBUG WebsiteSourceItem - Status info:', {
    sourceId: source.id,
    status,
    crawl_status: source.crawl_status,
    workflow_status: source.workflow_status,
    isCrawling,
    total_jobs: source.total_jobs,
    total_children: source.total_children,
    progress: source.progress
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
              {/* Header with title and URL */}
              <WebsiteSourceHeader
                source={source}
                onEdit={onEdit}
              />

              {/* Metadata */}
              <WebsiteSourceMetadata
                source={source}
                childSources={childSources}
                status={status}
              />
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

              {/* Child sources toggle - always show for website sources */}
              <Collapsible open={isChildSourcesOpen} onOpenChange={setIsChildSourcesOpen}>
                <WebsiteSourceToggle isOpen={isChildSourcesOpen} />
              </Collapsible>

              {/* Actions menu */}
              <WebsiteSourceActions
                source={source}
                buttonState={buttonState}
                onEdit={handleEditHeader}
                onExclude={onExclude}
                onDelete={onDelete}
                onRecrawl={onRecrawl}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible child sources - pass the correct crawling state */}
      <Collapsible open={isChildSourcesOpen} onOpenChange={setIsChildSourcesOpen}>
        <CollapsibleContent>
          <div className="ml-6 mr-3 mb-3">
            <WebsiteChildSources
              parentSourceId={source.id}
              isCrawling={isCrawling}
              onEdit={onEdit}
              onExclude={onExclude}
              onDelete={onDelete}
              onRecrawl={onRecrawl}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
