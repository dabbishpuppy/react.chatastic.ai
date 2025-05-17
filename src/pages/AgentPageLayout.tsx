
import React, { useState, ReactNode, useEffect, useRef } from "react";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/Logo";

interface AgentPageLayoutProps {
  children: ReactNode;
  defaultActiveTab: string;
  defaultPageTitle: string;
  headerActions?: ReactNode;
  showPageTitle?: boolean;
}

const AgentPageLayout: React.FC<AgentPageLayoutProps> = ({
  children,
  defaultActiveTab,
  defaultPageTitle,
  headerActions,
  showPageTitle = true,
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [pageTitle, setPageTitle] = useState(defaultPageTitle);
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent auto-scrolling when component mounts
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab]); // Reset scroll position when tab changes

  const handleTabChange = (tab: string, tabLabel: string) => {
    setActiveTab(tab);
    setPageTitle(tabLabel);
    
    // Ensure scroll position is reset to top when tab changes
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with fixed height and internal scroll */}
        <div className="w-64 border-r bg-white">
          <div className="p-4 border-b border-gray-200">
            <Logo size="md" />
          </div>
          <ScrollArea className="h-[calc(100vh-68px)]">
            <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          </ScrollArea>
        </div>

        {/* Main content with its own scroll */}
        <div 
          ref={contentRef} 
          className="flex-1 overflow-auto"
        >
          {showPageTitle && (
            <div 
              className="p-6 pb-0 flex justify-between items-center"
              style={{ 
                backgroundImage: 'radial-gradient(#e0e0e0 1px, transparent 1px)', 
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0',
                backgroundColor: '#f9f9f9'
              }}
            >
              <h1 className="text-3xl font-bold text-[#221F26]">{pageTitle}</h1>
              {headerActions && (
                <div className="flex items-center space-x-2">
                  {headerActions}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AgentPageLayout;
