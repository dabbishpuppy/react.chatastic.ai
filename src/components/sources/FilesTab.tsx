
import React from "react";
import { useOptimizedAgentSources } from "@/hooks/useOptimizedAgentSources";
import SourcesList from "./SourcesList";
import FileUploadArea from "./files/FileUploadArea";
import FileUploadProgress from "./files/FileUploadProgress";
import { useFileUpload } from "./files/useFileUpload";

const FilesTab: React.FC = () => {
  const { sources: allSources, loading, error, removeSourceFromState, refetch, getSourcesByType } = useOptimizedAgentSources();
  
  // Filter for file sources only
  const fileSources = getSourcesByType('file');
  
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

      <SourcesList 
        sources={fileSources} 
        loading={loading} 
        error={error}
        onSourceDeleted={removeSourceFromState}
      />
    </div>
  );
};

export default FilesTab;
