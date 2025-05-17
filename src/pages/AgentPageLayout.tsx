
import React, { useState, ReactNode, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader } from "lucide-react";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

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
  const [isLoading, setIsLoading] = useState(true);
  const [agentExists, setAgentExists] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { agentId } = useParams();
  const navigate = useNavigate();

  // Verify agent exists
  useEffect(() => {
    const checkAgent = async () => {
      if (!agentId) {
        navigate('/dashboard');
        return;
      }

      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id')
          .eq('id', agentId)
          .single();
        
        if (error || !data) {
          console.error("Agent not found:", error);
          setAgentExists(false);
          toast({
            title: "Agent not found",
            description: "The agent you're looking for doesn't exist or you don't have access to it.",
            variant: "destructive",
          });
          // Redirect with a short timeout to allow the toast to be seen
          setTimeout(() => navigate('/dashboard'), 1500);
          return;
        }
        
        setAgentExists(true);
      } catch (err) {
        console.error("Error checking agent:", err);
        setAgentExists(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAgent();
  }, [agentId, navigate]);

  useEffect(() => {
    // Reset active tab when agent changes
    setActiveTab(defaultActiveTab);
    setPageTitle(defaultPageTitle);
  }, [agentId, defaultActiveTab, defaultPageTitle]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading agent environment...</p>
      </div>
    );
  }

  if (!agentExists) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4">
        <h2 className="text-xl font-medium mb-2">Agent not found</h2>
        <p className="text-muted-foreground mb-4">This agent doesn't exist or you don't have access to it.</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

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
