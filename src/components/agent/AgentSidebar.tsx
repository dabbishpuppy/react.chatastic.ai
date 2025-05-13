import React, { useState } from "react";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Settings, 
  Zap,
  Share,
  Plus,
  Search,
  Check
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for teams - would be fetched from API in a real app
  const mockTeams = [
    { id: "1", name: "Wonderwave" },
  ];

  const menuItems = [
    { id: "playground", label: "Playground", icon: <FileText size={18} /> },
    { id: "activity", label: "Activity", icon: <Activity size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
    { id: "sources", label: "Sources", icon: <FileText size={18} /> },
    { id: "actions", label: "Actions", icon: <Zap size={18} /> },
    { id: "connect", label: "Connect", icon: <Share size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const handleClick = (tabId: string, tabLabel: string) => {
    onTabChange(tabId, tabLabel);
    
    if (tabId === "activity") {
      navigate(`/agent/${agentId}/activity`);
    } else if (tabId === "playground") {
      navigate(`/agent/${agentId}`);
    } else if (tabId === "analytics") {
      navigate(`/agent/${agentId}/analytics`);
    } else if (tabId === "sources") {
      navigate(`/agent/${agentId}/sources`);
    } else if (tabId === "actions") {
      navigate(`/agent/${agentId}/actions`);
    } else if (tabId === "connect") {
      navigate(`/agent/${agentId}/integrations`);
    } else if (tabId === "settings") {
      navigate(`/agent/${agentId}/settings`);
    }
  };

  const handleCreateTeam = () => {
    // This would open a modal or navigate to team creation page
    console.log("Create team clicked");
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-full border-gray-200"
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-sm font-medium text-gray-500">
            Teams
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mockTeams.map((team) => (
                <SidebarMenuItem key={team.id}>
                  <SidebarMenuButton 
                    className="bg-gray-100 px-3 py-2 rounded-md flex items-center justify-between font-medium"
                  >
                    <span>{team.name}</span>
                    <Check className="h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="px-4 py-2">
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 justify-center"
            onClick={handleCreateTeam}
          >
            <Plus className="h-4 w-4" />
            <span>Create team</span>
          </Button>
        </div>
        
        {/* Keep the agent navigation menu for when needed */}
        <div className="hidden">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id}
                      onClick={() => handleClick(item.id, item.label)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AgentSidebar;
