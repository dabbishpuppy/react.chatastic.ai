
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AgentSource } from '@/types/rag';
import { useWebsiteSourceOperations } from './hooks/useWebsiteSourceOperations';
import { useChildSourcesRealtime } from './hooks/useChildSourcesRealtime';
import WebsiteSourceHeader from './components/WebsiteSourceHeader';
import WebsiteSourceActions from './components/WebsiteSourceActions';
import WebsiteChildSources from './components/WebsiteChildSources';

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

  // Use real-time hook for child sources
  const realtimeChildSources = useChildSourcesRealtime(source.id, childSources);

  // Use the operations hook for enhanced recrawl
  const { handleEnhancedRecrawl } = useWebsiteSourceOperations(() => {}, () => {});

  const handleSaveEdit = async () => {
    await onEdit(source.id, editUrl);
    setIsEditing(false);
  };

  // Check if this is a parent source (no parent_source_id)
  const isParentSource = !source.parent_source_id;
  const hasChildSources = realtimeChildSources && realtimeChildSources.length > 0;

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUrl(source.url);
  };

  const handleExclude = () => {
    onExclude(source);
  };

  const handleRecrawl = () => {
    onRecrawl(source);
  };

  const handleEnhancedRecrawlClick = () => {
    handleEnhancedRecrawl(source);
  };

  const handleDelete = () => {
    onDelete(source);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <WebsiteSourceHeader
            source={source}
            childSources={realtimeChildSources}
            isSelected={isSelected}
            isEditing={isEditing}
            editUrl={editUrl}
            onSelectionChange={onSelectionChange}
            onEditUrlChange={setEditUrl}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
          
          <WebsiteSourceActions
            source={source}
            hasChildSources={hasChildSources}
            isExpanded={isExpanded}
            onEdit={handleEdit}
            onExclude={handleExclude}
            onRecrawl={handleRecrawl}
            onEnhancedRecrawl={handleEnhancedRecrawlClick}
            onDelete={handleDelete}
            onToggleExpanded={isParentSource ? handleToggleExpanded : undefined}
          />
        </div>

        {/* Child Sources Section - Show for parent sources when expanded */}
        {isParentSource && isExpanded && (
          <WebsiteChildSources
            parentSourceId={source.id}
            isCrawling={source.crawl_status === 'in_progress'}
            onEdit={onEdit}
            onExclude={onExclude}
            onDelete={onDelete}
            onRecrawl={onRecrawl}
          />
        )}
      </CardContent>
    </Card>
  );
};
