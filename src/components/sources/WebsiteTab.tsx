
import React from "react";
import WebsiteTabContainer from "./websites/containers/WebsiteTabContainer";
import ErrorBoundary from "./ErrorBoundary";

const WebsiteTab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Website">
      <WebsiteTabContainer />
    </ErrorBoundary>
  );
};

export default WebsiteTab;
