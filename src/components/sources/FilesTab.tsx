
import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import { useFileSourcesPaginated } from "@/hooks/useSourcesPaginated";
import SourcesListPaginated from "./SourcesListPaginated";
import FileUploadArea from "./files/FileUploadArea";
import FileUploadProgress from "./files/FileUploadProgress";
import { useFileUpload } from "./files/useFileUpload";

const FilesTabContent: React.FC = () => {
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useFileSourcesPaginated();
  
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

  // Flatten all pages into a single array
  const allSources = data?.pages.flatMap(page => page.sources) || [];

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Files</h2>
      </div>

      <FileUploadArea
        isDragging={isDragging}
        isUploading={isUploading}
        supportedTypes={supportedTypes}
        maxFileSize={maxFileSize}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      <FileUploadProgress
        uploadedFiles={uploadedFiles}
        onRemoveFile={removeUploadedFile}
      />

      <SourcesListPaginated 
        sources={allSources} 
        loading={isLoading} 
        error={error?.message || null}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        onSourceDeleted={() => refetch()}
      />
    </div>
  );
};

const FilesTab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Files">
      <FilesTabContent />
    </ErrorBoundary>
  );
};

export default FilesTab;
