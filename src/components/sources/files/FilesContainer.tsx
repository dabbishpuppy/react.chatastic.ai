
import React from "react";
import { useFileSourcesPaginated } from "@/hooks/useSourcesPaginated";
import { useFileUpload } from "./useFileUpload";
import FileUploadArea from "./FileUploadArea";
import FileUploadProgress from "./FileUploadProgress";
import SourcesListPaginated from "../SourcesListPaginated";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

const FilesContainer: React.FC = () => {
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

  const handleSourceDeleted = (sourceId: string) => {
    console.log('🗑️ Source deleted in FilesContainer:', sourceId);
    
    queryClient.invalidateQueries({ queryKey: ['sources'] });
    queryClient.invalidateQueries({ queryKey: ['sources', agentId] });
    queryClient.invalidateQueries({ queryKey: ['sources', agentId, 'file'] });
    
    refetch();
  };

  React.useEffect(() => {
    if (!agentId) return;

    const intervalId = setInterval(() => {
      refetch();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [agentId, refetch]);

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">File Training</h2>
      </div>

      <div className="space-y-4">
        <FileUploadArea 
          isDragging={isDragging}
          isUploading={isUploading}
          supportedTypes={supportedTypes}
          maxFileSize={maxFileSize * 1024 * 1024}
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
  );
};

export default FilesContainer;
