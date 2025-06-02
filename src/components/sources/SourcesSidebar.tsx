
import React from "react";
import SourcesWidget from "./SourcesWidget";

interface SourcesSidebarProps {
  currentTab: string;
}

const SourcesSidebar: React.FC<SourcesSidebarProps> = ({ currentTab }) => {
  return <SourcesWidget currentTab={currentTab} />;
};

export default SourcesSidebar;
