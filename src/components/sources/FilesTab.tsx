
import React from "react";
import { useFileSourcesPaginated } from "@/hooks/useSourcesPaginated";
import { useFileUpload } from "./files/useFileUpload";
import FileUploadArea from "./files/FileUploadArea";
import FileUploadProgress from "./files/FileUploadProgress";
import SourcesListPaginated from "./SourcesListPaginated";
import ErrorBoundary from "./ErrorBoundary";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

const FilesTab: React.FC = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch
  } = useFileSourcesPaginated(1, 25);

  const {
    isDragging,
    uploadedFiles,
    isUploading,
    supportedTypes,
    maxFileSize,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeUploadedFile
  } = useFileUpload(refetch);

  const sources = paginatedData?.sources || [];

  // Enhanced source deletion handler
  const handleSourceDeleted = (sourceId: string) => {
    console.log('🗑️ Source deleted in FilesTab:', sourceId);
    
    // Invalidate all relevant queries to ensure data consistency
    queryClient.invalidateQueries({ queryKey: ['sources'] });
    queryClient.invalidateQueries({ queryKey: ['sources', agentId] });
    queryClient.invalidateQueries({ queryKey: ['sources', agentId, 'file'] });
    
    // Force refetch the current data
    refetch();
  };

  // Set up real-time subscription for source changes
  React.useEffect(() => {
    if (!agentId) return;

    const intervalId = setInterval(() => {
      // Refetch data every 2 seconds to catch any changes
      refetch();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [agentId, refetch]);

  return (
    <ErrorBoundary tabName="Files">
      <div className="space-y-6 mt-4">
        <div>
          <h2 className="text-2xl font-semibold">File Training</h2>
        </div>

        <div className="space-y-4">
          <FileUploadArea 
            isDragging={isDragging}
            isUploading={isUploading}
            supportedTypes={supportedTypes}
            maxFileSize={maxFileSize * 1024 * 1024} // Convert MB to bytes
            onFileSelect={handleFileSelect}
            onUploadComplete={() => {}}
            onError={() => {}}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          {uploadedFiles.length > 0 && (
            <FileUploadProgress
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeUploadedFile}
            />
          )}
          
          <SourcesListPaginated
            sources={sources}
            loading={isLoading}
            error={error?.message || null}
            onSourceDeleted={handleSourceDeleted}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FilesTab;
