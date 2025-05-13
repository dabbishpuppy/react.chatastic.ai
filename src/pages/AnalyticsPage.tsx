
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import AnalyticsTab from "@/components/analytics/AnalyticsTab";

const AnalyticsPage: React.FC = () => {
  return (
    <AgentPageLayout defaultActiveTab="analytics" defaultPageTitle="Analytics">
      <AnalyticsTab />
    </AgentPageLayout>
  );
};

export default AnalyticsPage;
