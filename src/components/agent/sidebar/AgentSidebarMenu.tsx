
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Settings, 
  Zap,
  Share,
  Globe,
  Shield,
  LayoutTemplate,
  Bot,
  Bell,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  MessageSquare,
  UserRound,
  Cog
} from "lucide-react";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarSubmenuItem from "./SidebarSubmenuItem";

interface AgentSidebarMenuProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebarMenu: React.FC<AgentSidebarMenuProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  
  // Get current submenu from URL
  const getCurrentSubmenu = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("tab") || "";
  };

  // Initialize expanded menus based on active tab
  useEffect(() => {
    // Check if any submenu is active and expand its parent
    const currentSubmenu = getCurrentSubmenu();
    
    const shouldExpandSources = 
      activeTab === "sources" || 
      ["text", "files", "website", "qa"].includes(currentSubmenu);
      
    const shouldExpandConnect = 
      activeTab === "connect" || 
      ["embed", "share", "integrations"].includes(currentSubmenu);
      
    const shouldExpandSettings = 
      activeTab === "settings" ||
      location.pathname.includes("/settings/");
      
    const shouldExpandActivity =
      activeTab === "activity" ||
      location.pathname.includes("/activity");
      
    setExpandedMenus(prev => ({
      ...prev,
      sources: shouldExpandSources,
      connect: shouldExpandConnect,
      settings: shouldExpandSettings,
      activity: shouldExpandActivity
    }));
  }, [activeTab, location]);

  // Main menu items
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "playground", label: "Playground", icon: <FileText size={18} /> },
    { 
      id: "activity", 
      label: "Activity", 
      icon: <Activity size={18} />,
      hasSubmenu: true,
      submenu: [
        { id: "chat-log", label: "Chat Log", path: "activity", icon: <MessageSquare size={14} /> },
        { id: "leads", label: "Leads", path: "activity/leads", icon: <UserRound size={14} /> }
      ]
    },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
    { 
      id: "sources",
      label: "Sources", 
      icon: <FileText size={18} />,
      hasSubmenu: true,
      submenu: [
        { id: "text", label: "Text", path: "sources", icon: <FileText size={14} /> },
        { id: "files", label: "Files", path: "sources", icon: <FileText size={14} /> },
        { id: "website", label: "Website", path: "sources", icon: <Globe size={14} /> },
        { id: "qa", label: "Q&A", path: "sources", icon: <FileText size={14} /> }
      ]
    },
    { id: "actions", label: "Actions", icon: <Zap size={18} /> },
    { 
      id: "connect", 
      label: "Connect", 
      icon: <Share size={18} />,
      hasSubmenu: true,
      submenu: [
        { id: "embed", label: "Embed", path: "integrations", icon: <LayoutTemplate size={14} /> },
        { id: "share", label: "Share", path: "integrations", icon: <Share size={14} /> },
        { id: "integrations", label: "Integrations", path: "integrations", icon: <Bot size={14} /> }
      ]
    },
    { id: "management", label: "Management", icon: <Cog size={18} /> },
    { 
      id: "settings", 
      label: "Settings", 
      icon: <Settings size={18} />,
      hasSubmenu: true,
      submenu: [
        { id: "general", label: "General", path: "settings/general", icon: <Settings size={14} /> },
        { id: "ai", label: "AI", path: "settings/ai", icon: <Bot size={14} /> },
        { id: "chat-interface", label: "Interface", path: "settings/chat-interface", icon: <LayoutTemplate size={14} /> },
        { id: "security", label: "Security", path: "settings/security", icon: <Shield size={14} /> },
        { id: "leads", label: "Leads", path: "settings/leads", icon: <Users size={14} /> },
        { id: "notifications", label: "Notifications", path: "settings/notifications", icon: <Bell size={14} /> },
        { id: "custom-domains", label: "Domains", path: "settings/custom-domains", icon: <Globe size={14} /> }
      ]
    }
  ];

  const handleClick = (tabId: string, tabLabel: string, hasSubmenu?: boolean, e?: React.MouseEvent) => {
    // Prevent default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (hasSubmenu) {
      setExpandedMenus(prev => ({...prev, [tabId]: !prev[tabId]}));
      return;
    }
    
    // Call onTabChange first to ensure state is updated
    onTabChange(tabId, tabLabel);
    
    // Handle navigation without replace: true to prevent blank pages
    if (tabId === "dashboard") {
      navigate(`/dashboard`);
      return;
    }
    
    // Navigate to the correct routes
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
    } else if (tabId === "management") {
      navigate(`/agent/${agentId}/management`);
    } else if (tabId === "settings") {
      navigate(`/agent/${agentId}/settings/general`);
    }
  };

  const handleSubmenuClick = (parentTabId: string, submenuPath: string, submenuId: string, e?: React.MouseEvent) => {
    // Prevent default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    onTabChange(parentTabId, submenuId);
    
    // Handle navigation based on parent tab and submenu
    if (parentTabId === "activity") {
      if (submenuId === "chat-log") {
        navigate(`/agent/${agentId}/activity`);
      } else if (submenuId === "leads") {
        navigate(`/agent/${agentId}/activity/leads`);
      }
    } else if (submenuPath === "sources") {
      navigate(`/agent/${agentId}/sources?tab=${submenuId}`);
    } else if (submenuPath === "integrations") {
      navigate(`/agent/${agentId}/integrations?tab=${submenuId}`);
    } else {
      navigate(`/agent/${agentId}/${submenuPath}`);
    }
    
    // Keep the dropdown open
    setExpandedMenus(prev => ({...prev, [parentTabId]: true}));
  };

  // Check if a submenu item is active
  const isSubmenuActive = (parentId: string, subId: string) => {
    const currentSubmenu = getCurrentSubmenu();
    
    if (parentId === "activity") {
      if (subId === "chat-log") {
        return location.pathname.endsWith('/activity') && !location.pathname.includes('/leads');
      } else if (subId === "leads") {
        return location.pathname.includes('/activity/leads');
      }
    }
    
    if (parentId === "sources" && activeTab === "sources") {
      return currentSubmenu === subId;
    }
    
    if (parentId === "connect" && activeTab === "connect") {
      return currentSubmenu === subId;
    }
    
    if (parentId === "settings" && activeTab === "settings") {
      if (subId === "general") {
        return location.pathname.includes("/settings/general");
      } else if (location.pathname.includes(`/settings/${subId}`)) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <div className="flex-1 overflow-y-auto pt-6">
      {menuItems.map((item) => (
        <SidebarMenuItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          isActive={activeTab === item.id}
          hasSubmenu={item.hasSubmenu}
          isExpanded={expandedMenus[item.id]}
          onClick={(e) => handleClick(item.id, item.label, item.hasSubmenu, e)}
        >
          {item.submenu?.map((subItem) => (
            <SidebarSubmenuItem
              key={subItem.id}
              id={subItem.id}
              label={subItem.label}
              icon={subItem.icon}
              isActive={isSubmenuActive(item.id, subItem.id)}
              onClick={(e) => handleSubmenuClick(item.id, subItem.path, subItem.id, e)}
            />
          ))}
        </SidebarMenuItem>
      ))}
    </div>
  );
};

export default AgentSidebarMenu;
