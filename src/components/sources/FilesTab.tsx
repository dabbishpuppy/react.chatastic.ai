
import React from "react";
import { useFileSourcesPaginated } from "@/hooks/useSourcesPaginated";
import { useFileUpload } from "./files/useFileUpload";
import FileUploadArea from "./files/FileUploadArea";
import FileUploadProgress from "./files/FileUploadProgress";
import SourcesListPaginated from "./SourcesListPaginated";
import ErrorBoundary from "./ErrorBoundary";

const FilesTab: React.FC = () => {
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
            onSourceDeleted={(sourceId) => {
              // Refetch the sources list after deletion
              refetch();
            }}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FilesTab;
