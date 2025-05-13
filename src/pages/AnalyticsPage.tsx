
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import AnalyticsTab from "@/components/analytics/AnalyticsTab";

const AnalyticsPage: React.FC = () => {
  return (
    <AgentPageLayout defaultActiveTab="analytics" defaultPageTitle="Analytics">
      <div className="p-6">
        <AnalyticsTab />
      </div>
    </AgentPageLayout>
  );
};

export default AnalyticsPage;
