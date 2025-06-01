
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import SourcesWidget from "@/components/sources/SourcesWidget";
import TabContainer from "@/components/sources/containers/TabContainer";
import { useTabNavigation } from "@/components/sources/hooks/useTabNavigation";

const SourcesPage: React.FC = () => {
  const { getTabTitle, currentTab } = useTabNavigation();

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Sources" showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <h1 className="text-3xl font-bold mb-6">{getTabTitle()}</h1>
        <div className="flex gap-6">
          <div className="bg-white rounded-lg p-6 flex-1">
            <TabContainer />
          </div>
          <div className="w-80 flex-shrink-0">
            <SourcesWidget currentTab={currentTab} />
          </div>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default SourcesPage;
