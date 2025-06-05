
import React from "react";
import SourcesPageHeader from "./SourcesPageHeader";

interface SourcesPageLayoutProps {
  title: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode; // Make sidebar optional since we're not using it
}

const SourcesPageLayout: React.FC<SourcesPageLayoutProps> = ({ 
  title, 
  children
}) => {
  return (
    <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
      <SourcesPageHeader title={title} />
      <div className="bg-white rounded-lg p-6">
        {children}
      </div>
    </div>
  );
};

export default SourcesPageLayout;
