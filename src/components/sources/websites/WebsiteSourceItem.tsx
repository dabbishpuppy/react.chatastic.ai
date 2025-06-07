
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

  // Use real-time hook for child pages (SourcePage[])
  const realtimeChildPages = useChildSourcesRealtime(source.id, []);

  // Use the operations hook for enhanced recrawl
  const { handleEnhancedRecrawl } = useWebsiteSourceOperations(() => {}, () => {});

  const handleSaveEdit = async () => {
    await onEdit(source.id, editUrl);
    setIsEditing(false);
  };

  // Check if this is a parent source (no parent_source_id)
  const isParentSource = !source.parent_source_id;
  
  // For parent sources, show expand button if either:
  // 1. We have loaded child pages, OR
  // 2. It's a parent source (could potentially have children)
  const hasChildSources = isParentSource && (
    (realtimeChildPages && realtimeChildPages.length > 0) ||
    // Show expand button for parent sources even if children haven't loaded yet
    isParentSource
  );

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

  const handleDelete = () => {
    onDelete(source);
  };

  // Convert SourcePage to AgentSource for operations that need AgentSource
  const handleChildEdit = (sourceId: string, newUrl: string) => {
    onEdit(sourceId, newUrl);
  };

  const handleChildExclude = (childPage: any) => {
    // Create a minimal AgentSource-like object for the operation
    const sourceForOperation: AgentSource = {
      id: childPage.id,
      agent_id: source.agent_id,
      title: childPage.url,
      source_type: 'website' as const,
      url: childPage.url,
      created_at: childPage.created_at,
      updated_at: childPage.updated_at || childPage.created_at,
      is_active: true,
      requires_manual_training: false,
      parent_source_id: childPage.parent_source_id
    };
    onExclude(sourceForOperation);
  };

  const handleChildDelete = (childPage: any) => {
    // Create a minimal AgentSource-like object for the operation
    const sourceForOperation: AgentSource = {
      id: childPage.id,
      agent_id: source.agent_id,
      title: childPage.url,
      source_type: 'website' as const,
      url: childPage.url,
      created_at: childPage.created_at,
      updated_at: childPage.updated_at || childPage.created_at,
      is_active: true,
      requires_manual_training: false,
      parent_source_id: childPage.parent_source_id
    };
    onDelete(sourceForOperation);
  };

  const handleChildRecrawl = (childPage: any) => {
    // Create a minimal AgentSource-like object for the operation
    const sourceForOperation: AgentSource = {
      id: childPage.id,
      agent_id: source.agent_id,
      title: childPage.url,
      source_type: 'website' as const,
      url: childPage.url,
      created_at: childPage.created_at,
      updated_at: childPage.updated_at || childPage.created_at,
      is_active: true,
      requires_manual_training: false,
      parent_source_id: childPage.parent_source_id
    };
    onRecrawl(sourceForOperation);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <WebsiteSourceHeader
            source={source}
            childSources={realtimeChildPages}
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
            onDelete={handleDelete}
            onToggleExpanded={isParentSource ? handleToggleExpanded : undefined}
          />
        </div>

        {/* Child Sources Section - Show for parent sources when expanded */}
        {isParentSource && isExpanded && (
          <WebsiteChildSources
            parentSourceId={source.id}
            isCrawling={source.crawl_status === 'in_progress'}
            onEdit={handleChildEdit}
            onExclude={handleChildExclude}
            onDelete={handleChildDelete}
            onRecrawl={handleChildRecrawl}
          />
        )}
      </CardContent>
    </Card>
  );
};
