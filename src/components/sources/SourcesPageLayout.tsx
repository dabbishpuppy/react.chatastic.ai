
import React from "react";
import SourcesPageHeader from "./SourcesPageHeader";

interface SourcesPageLayoutProps {
  title: string;
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

const SourcesPageLayout: React.FC<SourcesPageLayoutProps> = ({ 
  title, 
  children, 
  sidebar 
}) => {
  return (
    <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
      <SourcesPageHeader title={title} />
      <div className="flex gap-6">
        <div className="bg-white rounded-lg p-6 flex-1">
          {children}
        </div>
        <div className="w-80 flex-shrink-0">
          {sidebar}
        </div>
      </div>
    </div>
  );
};

export default SourcesPageLayout;
