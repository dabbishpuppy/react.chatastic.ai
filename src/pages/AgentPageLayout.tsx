
import React, { useState, ReactNode } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
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

      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden w-full">
          {/* Left sidebar */}
          <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Main content with its own scroll */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold">{pageTitle}</h1>
            </div>
            {children}
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AgentPageLayout;
