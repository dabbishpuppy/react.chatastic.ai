
import React from 'react';
import AgentPageLayout from './AgentPageLayout';
import SourceDetailHeader from '@/components/sources/source-detail/SourceDetailHeader';
import SourceDetailContent from '@/components/sources/source-detail/SourceDetailContent';
import DeleteSourceDialog from '@/components/sources/DeleteSourceDialog';
import SimplifiedSourcesWidget from '@/components/sources/SimplifiedSourcesWidget';
import WorkflowEventTimeline from '@/components/workflow/WorkflowEventTimeline';
import WorkflowJobsPanel from '@/components/workflow/WorkflowJobsPanel';
import { useSourceDetail } from '@/components/sources/source-detail/useSourceDetail';
import { useWorkflowRealtime } from '@/hooks/useWorkflowRealtime';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // Set up real-time workflow updates for this specific source
  useWorkflowRealtime({ 
    sourceId: source?.id,
    onEvent: (event) => {
      console.log('Source detail workflow event:', event);
    }
  });

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

            <div className="mt-8">
              <Tabs defaultValue="content" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
                </TabsList>

                <TabsContent value="content">
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
                </TabsContent>

                <TabsContent value="workflow">
                  <WorkflowEventTimeline sourceId={source.id} />
                </TabsContent>

                <TabsContent value="jobs">
                  <WorkflowJobsPanel sourceId={source.id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <SimplifiedSourcesWidget />
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
