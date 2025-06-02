
import React from "react";

interface SourcesPageHeaderProps {
  title: string;
}

const SourcesPageHeader: React.FC<SourcesPageHeaderProps> = ({ title }) => {
  return (
    <h1 className="text-3xl font-bold mb-6">{title}</h1>
  );
};

export default SourcesPageHeader;
