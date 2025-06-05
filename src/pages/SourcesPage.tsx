
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import SourcesPageLayout from "@/components/sources/SourcesPageLayout";
import SourcesMainContent from "@/components/sources/SourcesMainContent";
import { useTabNavigation } from "@/components/sources/hooks/useTabNavigation";

const SourcesPage: React.FC = () => {
  const { getTabTitle } = useTabNavigation();

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Sources" showPageTitle={false}>
      <SourcesPageLayout title={getTabTitle()}>
        <SourcesMainContent />
      </SourcesPageLayout>
    </AgentPageLayout>
  );
};

export default SourcesPage;
