
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, User, LogOut } from "lucide-react";
import AgentSidebarMenu from "./sidebar/AgentSidebarMenu";
import SidebarActions from "../dashboard/SidebarActions";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col h-full">
      <AgentSidebarMenu activeTab={activeTab} onTabChange={onTabChange} />
      <SidebarActions />
    </div>
  );
};

export default AgentSidebar;
