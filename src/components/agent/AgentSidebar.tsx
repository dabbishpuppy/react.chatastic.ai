
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, User, LogOut, Menu } from "lucide-react";
import AgentSidebarMenu from "./sidebar/AgentSidebarMenu";
import SidebarActions from "../dashboard/SidebarActions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

// Sample agent data structure - in a real implementation, this would come from a data store or API
const agentsData = [
  {
    id: "1",
    name: "Wonder AI",
    color: "bg-violet-600",
  },
  {
    id: "2",
    name: "Agora AI",
    color: "bg-amber-100",
  },
  {
    id: "3",
    name: "PristineBag AI",
    color: "bg-rose-400",
  },
  {
    id: "4",
    name: "AI Kundeservice",
    color: "bg-black",
  },
  {
    id: "5",
    name: "theballooncompany.com",
    color: "bg-white",
  }
];

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const { agentId } = useParams();
  const [currentAgent, setCurrentAgent] = useState<{id: string, name: string, color: string} | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Find the current agent based on the URL parameter
  useEffect(() => {
    if (agentId) {
      const agent = agentsData.find(agent => agent.id === agentId);
      if (agent) {
        setCurrentAgent(agent);
      }
    }
  }, [agentId]);

  // Close the sidebar when tab changes on mobile
  const handleTabChangeWrapper = (tab: string, tabLabel: string) => {
    onTabChange(tab, tabLabel);
    if (isMobile) {
      setOpen(false);
    }
  };

  // For desktop: render the normal sidebar
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Agent header section */}
      {currentAgent && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 ${currentAgent.color} rounded-sm flex-shrink-0`}></div>
            <span className="font-medium truncate">{currentAgent.name}</span>
          </div>
        </div>
      )}
      
      <AgentSidebarMenu activeTab={activeTab} onTabChange={handleTabChangeWrapper} />
      <SidebarActions />
    </div>
  );

  // For mobile: render the sidebar in a drawer
  if (isMobile) {
    return (
      <>
        <SheetTrigger asChild onClick={() => setOpen(true)}>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu size={24} />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // For desktop: render the sidebar directly
  return (
    <div className="hidden md:flex w-64 flex-col h-full">
      {sidebarContent}
    </div>
  );
};

export default AgentSidebar;
