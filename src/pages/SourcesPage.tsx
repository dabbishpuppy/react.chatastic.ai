
import React, { useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import SourcesPageLayout from "@/components/sources/SourcesPageLayout";
import SourcesMainContent from "@/components/sources/SourcesMainContent";
import { useTabNavigation } from "@/components/sources/hooks/useTabNavigation";
import { useWorkflowSystem } from "@/hooks/useWorkflowSystem";
import { useWorkflowRealtime } from "@/hooks/useWorkflowRealtime";

const SourcesPage: React.FC = () => {
  const { getTabTitle } = useTabNavigation();
  const { isInitialized, isInitializing, error } = useWorkflowSystem();
  
  // Enable workflow real-time updates
  useWorkflowRealtime();

  useEffect(() => {
    if (isInitialized) {
      console.log('✅ Workflow system ready for Sources page');
    }
    if (error) {
      console.error('❌ Workflow system error:', error);
    }
  }, [isInitialized, error]);

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Sources" showPageTitle={false}>
      <SourcesPageLayout title={getTabTitle()}>
        <SourcesMainContent />
      </SourcesPageLayout>
    </AgentPageLayout>
  );
};

export default SourcesPage;
