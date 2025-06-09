
import React from 'react';
import AgentPageLayout from './AgentPageLayout';
import SourceDetailHeader from '@/components/sources/source-detail/SourceDetailHeader';
import SourceDetailContent from '@/components/sources/source-detail/SourceDetailContent';
import DeleteSourceDialog from '@/components/sources/DeleteSourceDialog';
import SimplifiedSourcesWidget from '@/components/sources/SimplifiedSourcesWidget';
import WorkflowEventTimeline from '@/components/workflow/WorkflowEventTimeline';
import WorkflowJobsPanel from '@/components/workflow/WorkflowJobsPanel';
import WorkflowControls from '@/components/workflow/WorkflowControls';
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
    agentId,
    refetch,
    isPageSource
  } = useSourceDetail();

  // Set up real-time workflow updates for this specific source
  useWorkflowRealtime({ 
    sourceId: source?.id,
    onEvent: (event) => {
      console.log('Source detail workflow event:', event);
      refetch?.(); // Refresh source data when workflow events occur
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
            <div className="text-red-500">{isPageSource ? 'Page' : 'Source'} not found</div>
          </div>
        </div>
      </AgentPageLayout>
    );
  }

  const pageTitle = isPageSource ? 'Page Details' : 'Source Details';

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle={pageTitle} showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] min-h-screen">
        <div className="flex gap-8">
          <div className="flex-1">
            <SourceDetailHeader
              source={source}
              isEditing={isEditing}
              onBackClick={handleBackClick}
              onDeleteClick={() => setShowDeleteDialog(true)}
              isPageSource={isPageSource}
            />

            <div className="mt-8">
              <Tabs defaultValue="content" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  {!isPageSource && (
                    <>
                      <TabsTrigger value="workflow">Workflow</TabsTrigger>
                      <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
                      <TabsTrigger value="controls">Controls</TabsTrigger>
                    </>
                  )}
                  {isPageSource && (
                    <TabsTrigger value="chunks">Chunks</TabsTrigger>
                  )}
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
                    isPageSource={isPageSource}
                  />
                </TabsContent>

                {!isPageSource && (
                  <>
                    <TabsContent value="workflow">
                      <WorkflowEventTimeline sourceId={source.id} />
                    </TabsContent>

                    <TabsContent value="jobs">
                      <WorkflowJobsPanel sourceId={source.id} />
                    </TabsContent>

                    <TabsContent value="controls">
                      <WorkflowControls source={source} onRefresh={refetch} />
                    </TabsContent>
                  </>
                )}

                {isPageSource && (
                  <TabsContent value="chunks">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold mb-4">Content Chunks</h3>
                      <p className="text-gray-600">
                        This page has been processed into {source.chunks_created || 0} chunks for AI training.
                      </p>
                      {source.content_size && (
                        <p className="text-sm text-gray-500 mt-2">
                          Original content size: {Math.round(source.content_size / 1024)} KB
                        </p>
                      )}
                    </div>
                  </TabsContent>
                )}
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
