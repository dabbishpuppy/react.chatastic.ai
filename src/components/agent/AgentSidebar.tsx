
import React, { useState, useEffect } from "react";
import { 
  Activity, 
  BarChart2, 
  FileText, 
  Settings, 
  Zap,
  Share,
  Plus,
  DollarSign,
  User,
  LogOut,
  ChevronDown,
  ChevronUp,
  Globe,
  Shield,
  LayoutTemplate,
  Bot,
  Bell,
  Users,
  LineChart
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string, tabLabel: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeTab, onTabChange }) => {
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
      
    setExpandedMenus(prev => ({
      ...prev,
      sources: shouldExpandSources,
      connect: shouldExpandConnect,
      settings: shouldExpandSettings
    }));
  }, [activeTab, location]);

  // Main menu items
  const menuItems = [
    { id: "playground", label: "Playground", icon: <FileText size={18} /> },
    { id: "activity", label: "Activity", icon: <Activity size={18} /> },
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
        { id: "usage", label: "Usage", path: "settings/usage", icon: <LineChart size={14} /> },
        { id: "leads", label: "Leads", path: "settings/leads", icon: <Users size={14} /> },
        { id: "notifications", label: "Notifications", path: "settings/notifications", icon: <Bell size={14} /> },
        { id: "custom-domains", label: "Domains", path: "settings/custom-domains", icon: <Globe size={14} /> }
      ]
    },
  ];

  const handleClick = (tabId: string, tabLabel: string, hasSubmenu?: boolean) => {
    if (hasSubmenu) {
      setExpandedMenus(prev => ({...prev, [tabId]: !prev[tabId]}));
      return;
    }
    
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
    
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };

  const handleSubmenuClick = (parentTabId: string, submenuPath: string, submenuId: string) => {
    onTabChange(parentTabId, submenuId);
    
    if (submenuPath === "sources") {
      navigate(`/agent/${agentId}/sources?tab=${submenuId}`);
    } else if (submenuPath === "integrations") {
      navigate(`/agent/${agentId}/integrations?tab=${submenuId}`);
    } else {
      navigate(`/agent/${agentId}/${submenuPath}`);
    }
    
    // Keep the dropdown open
    setExpandedMenus(prev => ({...prev, [parentTabId]: true}));
    
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };

  const handleCreateAgent = () => {
    navigate("/dashboard/new-agent");
  };

  const handleUpgradeClick = () => {
    navigate("/settings/plans");
  };

  const handleMyAccountClick = () => {
    navigate("/settings/general");
  };

  const handleLogoutClick = () => {
    navigate("/signout");
  };

  // Check if a submenu item is active
  const isSubmenuActive = (parentId: string, subId: string) => {
    const currentSubmenu = getCurrentSubmenu();
    
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pt-6">
        {menuItems.map((item) => (
          <div key={item.id} className="mb-1">
            <button
              className={`w-full flex items-center justify-between px-6 py-2.5 text-sm ${
                activeTab === item.id
                  ? "bg-gray-100 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => handleClick(item.id, item.label, item.hasSubmenu)}
            >
              <div className="flex items-center">
                <span className="mr-3 text-gray-500">{item.icon}</span>
                {item.label}
              </div>
              {item.hasSubmenu && (
                <span className="text-gray-500 transition-transform duration-200">
                  {expandedMenus[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              )}
            </button>
            
            {/* Submenu with transition effect */}
            {item.hasSubmenu && (
              <div 
                className={`ml-10 overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedMenus[item.id] 
                    ? "max-h-64 opacity-100 mt-1 mb-2" 
                    : "max-h-0 opacity-0"
                }`}
              >
                {item.submenu?.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`w-full text-left py-2 px-3 text-sm rounded-md flex items-center transition-colors duration-200 ${
                      isSubmenuActive(item.id, subItem.id)
                        ? "bg-gray-100 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleSubmenuClick(item.id, subItem.path, subItem.id)}
                  >
                    <span className="mr-2 text-gray-500">{subItem.icon}</span>
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Bottom section */}
      <div className="border-t p-4 space-y-4">
        {/* Usage Credits */}
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-sm font-medium text-gray-800">Usage Credits</div>
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-500">Free Plan</div>
            <div className="text-xs font-medium text-purple-600">5 left</div>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">0 of 5 used</div>
        </div>
        
        {/* Upgrade button */}
        <Button 
          onClick={handleUpgradeClick}
          className="w-full flex items-center justify-center"
          size="sm"
        >
          <DollarSign size={16} className="mr-1" />
          Upgrade
        </Button>
        
        {/* My Account and Logout */}
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start text-gray-700"
            size="sm"
            onClick={handleMyAccountClick}
          >
            <User size={16} className="mr-2" />
            My Account
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start text-gray-700"
            size="sm"
            onClick={handleLogoutClick}
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
