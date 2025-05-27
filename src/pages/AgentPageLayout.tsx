
import React, { useState, ReactNode, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
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
  const location = useLocation();

  // Determine if we're on the chat interface settings page
  const isChatInterfacePage = location.pathname.includes('chat-interface');

  // Comprehensive scroll prevention for chat interface page
  useEffect(() => {
    if (isChatInterfacePage) {
      // Prevent scroll restoration
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      
      // Force scroll to top immediately
      if (contentRef.current) {
        contentRef.current.scrollTo(0, 0);
      }
      window.scrollTo(0, 0);
      
      // Apply scroll prevention styles
      if (contentRef.current) {
        contentRef.current.style.overscrollBehavior = 'contain';
        contentRef.current.style.scrollBehavior = 'auto';
        contentRef.current.style.scrollSnapType = 'none';
        contentRef.current.classList.add('chat-interface-no-scroll');
      }
      
      // Set document-level scroll prevention
      document.body.style.overscrollBehavior = 'contain';
      document.body.style.scrollBehavior = 'auto';
      document.documentElement.style.scrollBehavior = 'auto';
    }
    
    // Cleanup function
    return () => {
      if (contentRef.current) {
        contentRef.current.style.overscrollBehavior = '';
        contentRef.current.style.scrollBehavior = '';
        contentRef.current.style.scrollSnapType = '';
        contentRef.current.classList.remove('chat-interface-no-scroll');
      }
      
      if (isChatInterfacePage) {
        document.body.style.overscrollBehavior = '';
        document.body.style.scrollBehavior = '';
        document.documentElement.style.scrollBehavior = '';
        
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'auto';
        }
      }
    };
  }, [isChatInterfacePage]);

  // Handle route changes to ensure we start at top for chat interface
  useEffect(() => {
    if (isChatInterfacePage) {
      // Force immediate scroll to top on route change
      const forceScrollTop = () => {
        if (contentRef.current) {
          contentRef.current.scrollTo(0, 0);
        }
        window.scrollTo(0, 0);
      };
      
      // Execute immediately and after a small delay to catch any async scrolling
      forceScrollTop();
      const timeoutId = setTimeout(forceScrollTop, 0);
      const timeoutId2 = setTimeout(forceScrollTop, 10);
      const timeoutId3 = setTimeout(forceScrollTop, 50);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [location.pathname, isChatInterfacePage]);

  const handleTabChange = (tab: string, tabLabel: string) => {
    setActiveTab(tab);
    setPageTitle(tabLabel);
    
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

        {/* Main content with controlled scrolling */}
        <div 
          ref={contentRef} 
          className={`flex-1 overflow-auto ${isChatInterfacePage ? 'chat-interface-container' : ''}`}
        >
          {children}
        </div>
      </div>
      
      {/* Add CSS for chat interface scroll prevention */}
      {isChatInterfacePage && (
        <style dangerouslySetInnerHTML={{
          __html: `
            .chat-interface-container {
              scroll-behavior: auto !important;
              overscroll-behavior: contain !important;
              scroll-snap-type: none !important;
            }
            
            .chat-interface-container * {
              scroll-behavior: auto !important;
            }
            
            .chat-interface-no-scroll input:focus,
            .chat-interface-no-scroll textarea:focus {
              scroll-behavior: auto !important;
            }
            
            .chat-interface-no-scroll input,
            .chat-interface-no-scroll textarea {
              scroll-margin: 0 !important;
              scroll-margin-top: 0 !important;
              scroll-margin-bottom: 0 !important;
            }
          `
        }} />
      )}
    </div>
  );
};

export default AgentPageLayout;
