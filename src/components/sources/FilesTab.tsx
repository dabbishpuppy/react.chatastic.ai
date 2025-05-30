import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileSourcesPaginated } from "@/hooks/useSourcesPaginated";
import FileUploadArea from "./files/FileUploadArea";
import SourcesListPaginated from "./SourcesListPaginated";
import ErrorBoundary from "./ErrorBoundary";

const FilesTab: React.FC = () => {
  const {
    data: paginatedData,
    isLoading,
    error
  } = useFileSourcesPaginated(1, 25);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const handleFileSelect = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const sources = paginatedData?.sources || [];

  return (
    <ErrorBoundary tabName="Files">
      <div className="space-y-6 mt-4">
        <div>
          <h2 className="text-2xl font-semibold">File Training</h2>
        </div>

        <div className="space-y-4">
          <FileUploadArea />
          
          <SourcesListPaginated
            sources={sources}
            loading={isLoading}
            error={error?.message || null}
            onSourceDeleted={(sourceId) => {
              // Handle source deletion if needed
            }}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FilesTab;
