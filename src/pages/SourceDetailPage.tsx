
import React from 'react';
import AgentPageLayout from './AgentPageLayout';
import SourceDetailHeader from '@/components/sources/source-detail/SourceDetailHeader';
import SourceDetailContent from '@/components/sources/source-detail/SourceDetailContent';
import DeleteSourceDialog from '@/components/sources/DeleteSourceDialog';
import SimplifiedSourcesWidget from '@/components/sources/SimplifiedSourcesWidget';
import { useSourceDetail } from '@/components/sources/source-detail/useSourceDetail';
import { useAgentSourceStats } from '@/hooks/useAgentSourceStats';
import { useSourceSizeCalculations } from '@/hooks/useSourceSizeCalculations';

const SourceDetailPage: React.FC = () => {
  const {
    source,
    loading,
    isEditing,
    isSaving,
    isDeleting,
    showDeleteDialog,
    editTitle,
    editContent,
    setIsEditing,
    setShowDeleteDialog,
    setEditTitle,
    setEditContent,
    handleSave,
    handleDelete,
    handleBackClick,
    handleCancelEdit,
    agentId
  } = useSourceDetail();

  // Fetch agent source statistics for the widget
  const { data: statsData, isLoading: statsLoading } = useAgentSourceStats(agentId);
  
  // Use empty array as fallback when stats are loading
  const sourcesForCalculation = statsData?.sources || [];
  
  // Calculate source sections for the widget
  const { sourcesByType: sourceSections } = useSourceSizeCalculations(sourcesForCalculation);
  
  // Prepare data for SimplifiedSourcesWidget
  const sourcesByType = sourceSections.reduce((acc, section) => {
    acc[section.type] = {
      count: section.sources.length,
      size: section.sources.reduce((total, source) => {
        // Use total_content_size if available, otherwise fall back to content size estimation
        return total + (source.total_content_size || (source.content?.length || 0));
      }, 0)
    };
    return acc;
  }, {} as Record<string, { count: number; size: number }>);

  if (loading) {
    return (
      <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Source Details">
        <div className="p-8 bg-[#f5f5f5] min-h-screen">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading source details...</div>
          </div>
        </div>
      </AgentPageLayout>
    );
  }

  if (!source) {
    return (
      <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Source Not Found">
        <div className="p-8 bg-[#f5f5f5] min-h-screen">
          <div className="text-center">
            <div className="text-red-500">Source not found</div>
          </div>
        </div>
      </AgentPageLayout>
    );
  }

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Source Details" showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] min-h-screen">
        <div className="flex gap-8">
          <div className="flex-1">
            <SourceDetailHeader
              source={source}
              isEditing={isEditing}
              onBackClick={handleBackClick}
              onDeleteClick={() => setShowDeleteDialog(true)}
            />

            <SourceDetailContent
              source={source}
              isEditing={isEditing}
              editTitle={editTitle}
              editContent={editContent}
              isSaving={isSaving}
              onStartEdit={() => setIsEditing(true)}
              onTitleChange={setEditTitle}
              onContentChange={setEditContent}
              onSave={handleSave}
              onCancel={handleCancelEdit}
            />
          </div>

          <div className="w-80 flex-shrink-0">
            <SimplifiedSourcesWidget
              sourcesByType={sourcesByType}
              totalSize={statsData?.totalSize || "0 B"}
            />
          </div>
        </div>

        <DeleteSourceDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          sourceTitle={source.title}
          isDeleting={isDeleting}
        />
      </div>
    </AgentPageLayout>
  );
};

export default SourceDetailPage;
