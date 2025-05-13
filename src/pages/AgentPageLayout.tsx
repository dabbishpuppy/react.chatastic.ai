
import React, { useState, ReactNode } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentPageLayoutProps {
  children: ReactNode;
  defaultActiveTab: string;
  defaultPageTitle: string;
}

const AgentPageLayout: React.FC<AgentPageLayoutProps> = ({
  children,
  defaultActiveTab,
  defaultPageTitle,
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [pageTitle, setPageTitle] = useState(defaultPageTitle);

  const handleTabChange = (tab: string, tabLabel: string) => {
    setActiveTab(tab);
    setPageTitle(tabLabel);
  };

  return (
    <div className="flex flex-col h-screen">
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with fixed height and internal scroll */}
        <div className="w-64 border-r bg-white">
          <ScrollArea className="h-full">
            <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          </ScrollArea>
        </div>

        {/* Main content with its own scroll */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AgentPageLayout;
