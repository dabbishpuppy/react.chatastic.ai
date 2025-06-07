
import React from 'react';
import AgentPageLayout from './AgentPageLayout';
import SourceDetailHeader from '@/components/sources/source-detail/SourceDetailHeader';
import SourceDetailContent from '@/components/sources/source-detail/SourceDetailContent';
import DeleteSourceDialog from '@/components/sources/DeleteSourceDialog';
import SimplifiedSourcesWidget from '@/components/sources/SimplifiedSourcesWidget';
import { useSourceDetail } from '@/components/sources/source-detail/useSourceDetail';
import { useAgentSourceStats } from '@/hooks/useAgentSourceStats';

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
  const { data: statsData, isLoading: statsLoading } = useAgentSourceStats();
  
  // Prepare data for SimplifiedSourcesWidget from the correct stats structure
  const sourcesByType = statsData?.sourcesByType || {
    text: { count: 0, size: 0 },
    file: { count: 0, size: 0 },
    website: { count: 0, size: 0 },
    qa: { count: 0, size: 0 }
  };

  // Format total bytes to readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = bytes / Math.pow(k, i);
    const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
    
    return `${formattedSize} ${sizes[i]}`;
  };

  const totalSize = formatBytes(statsData?.totalBytes || 0);

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
              totalSize={totalSize}
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
