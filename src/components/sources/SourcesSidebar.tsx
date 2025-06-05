
import React from "react";
import SimplifiedSourcesWidget from "./SimplifiedSourcesWidget";

interface SourcesSidebarProps {
  currentTab: string;
}

const SourcesSidebar: React.FC<SourcesSidebarProps> = ({ currentTab }) => {
  return <SimplifiedSourcesWidget currentTab={currentTab} />;
};

export default SourcesSidebar;
