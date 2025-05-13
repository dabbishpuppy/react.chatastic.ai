
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatLogsTab from "@/components/activity/ChatLogsTab";

const ActivityPage: React.FC = () => {
  return (
    <AgentPageLayout defaultActiveTab="activity" defaultPageTitle="Activity">
      <ChatLogsTab />
    </AgentPageLayout>
  );
};

export default ActivityPage;
