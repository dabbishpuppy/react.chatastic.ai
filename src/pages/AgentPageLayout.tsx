
import React, { useState, ReactNode, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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

    // Close mobile sidebar when navigation happens
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  const sidebarContent = (
    <ScrollArea className="h-[calc(100vh-68px)]">
      <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
    </ScrollArea>
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile header */}
      {isMobile && (
        <div className="p-4 border-b border-gray-200 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={24} />
          </Button>
          <span className="font-medium">{pageTitle}</span>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with fixed height and internal scroll */}
        {isMobile ? (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[280px]">
              <div className="p-4 border-b border-gray-200">
                <Logo size="md" />
              </div>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          <div className="w-64 border-r bg-white hidden md:block">
            <div className="p-4 border-b border-gray-200">
              <Logo size="md" />
            </div>
            {sidebarContent}
          </div>
        )}

        {/* Main content with its own scroll */}
        <div 
          ref={contentRef} 
          className="flex-1 overflow-auto"
        >
          {showPageTitle && !isMobile && (
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
