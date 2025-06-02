
import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import FilesContainer from "./files/FilesContainer";

const FilesTab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Files">
      <FilesContainer />
    </ErrorBoundary>
  );
};

export default FilesTab;
