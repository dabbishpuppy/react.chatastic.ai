
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

  // Prevent scroll restoration and force scroll to top on navigation
  useEffect(() => {
    const preventScroll = () => {
      if (history.scrollRestoration) {
        history.scrollRestoration = 'manual';
      }
      
      window.scrollTo(0, 0);
      
      // Remove focus from any element that may trigger scroll
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    
    // Apply immediately
    preventScroll();
    
    // And after a slight delay to override any competing focus events
    const timer = setTimeout(preventScroll, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleTabChange = (tab: string, tabLabel: string) => {
    setActiveTab(tab);
    setPageTitle(tabLabel);
    
    // Forces scroll to top and prevents restoration
    window.scrollTo(0, 0);
    
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
    <div className="flex flex-col h-screen overflow-hidden">
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
          className="flex-1 overflow-auto scroll-smooth"
          style={{ 
            scrollBehavior: 'auto', 
            overscrollBehavior: 'none', 
            scrollPaddingTop: 0,
            scrollMarginTop: 0
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default AgentPageLayout;
