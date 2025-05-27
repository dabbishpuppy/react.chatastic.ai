
import React, { useEffect, useRef } from "react";
import { Routes, Route, useParams, useLocation, Navigate } from "react-router-dom";
import AgentPageLayout from "./AgentPageLayout";
import GeneralSettings from "@/components/agent/settings/GeneralSettings";
import AISettings from "@/components/agent/settings/AISettings";
import ChatInterfaceSettings from "@/components/agent/settings/ChatInterfaceSettings";
import SecuritySettings from "@/components/agent/settings/SecuritySettings";
import LeadsSettings from "@/components/agent/settings/LeadsSettings";
import NotificationsSettings from "@/components/agent/settings/NotificationsSettings";
import CustomDomainsSettings from "@/components/agent/settings/CustomDomainsSettings";
import { useIsMobile } from "@/hooks/use-mobile";

const AgentSettingsPage: React.FC = () => {
  const { agentId } = useParams();
  const location = useLocation();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Extract the active tab from the URL
  const getActiveTab = () => {
    const parts = location.pathname.split('/');
    // Get the last non-empty segment of the URL
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] && parts[i] !== "settings") {
        return parts[i];
      }
    }
    return "general";
  };

  const activeTab = getActiveTab();

  // Get the current settings page title
  const getPageTitle = () => {
    switch(activeTab) {
      case "general": return "General";
      case "ai": return "AI";
      case "chat-interface": return "Interface";
      case "security": return "Security";
      case "leads": return "Leads";
      case "notifications": return "Notifications";
      case "custom-domains": return "Domains";
      case "usage": return "Usage";
      default: return "General";
    }
  };

  // Enhanced scroll prevention for chat-interface page
  useEffect(() => {
    if (activeTab === "chat-interface") {
      // Prevent any scroll restoration or automatic scrolling
      if ('scrollRestoration' in history) {
        const originalScrollRestoration = history.scrollRestoration;
        history.scrollRestoration = 'manual';
        
        // Ensure page starts at top
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
        
        // Disable various scroll behaviors at document level
        document.body.style.overscrollBehavior = 'contain';
        document.body.style.scrollBehavior = 'auto';
        document.documentElement.style.scrollBehavior = 'auto';
        
        return () => {
          // Cleanup
          history.scrollRestoration = originalScrollRestoration;
          document.body.style.overscrollBehavior = '';
          document.body.style.scrollBehavior = '';
          document.documentElement.style.scrollBehavior = '';
        };
      }
    }
  }, [activeTab]);

  // Handle route changes specifically for chat-interface
  useEffect(() => {
    if (activeTab === "chat-interface") {
      // Force scroll to top on route change
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      }, 0);
    }
  }, [location.pathname, activeTab]);

  return (
    <AgentPageLayout defaultActiveTab="settings" defaultPageTitle={getPageTitle()} showPageTitle={false}>
      <div 
        className={`flex flex-col p-8 bg-[#f5f5f5] w-full min-h-screen ${
          activeTab === "chat-interface" ? "no-auto-scroll" : ""
        }`}
        ref={contentRef}
        style={{
          ...(activeTab === "chat-interface" && {
            scrollBehavior: 'auto',
            overscrollBehavior: 'contain',
            scrollSnapType: 'none'
          })
        }}
      >
        <h1 className="text-3xl font-bold mb-6">{getPageTitle()}</h1>
        
        {/* Settings content */}
        <div className="bg-white rounded-lg p-6">
          <Routes>
            <Route path="/" element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="chat-interface" element={<ChatInterfaceSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="leads" element={<LeadsSettings />} />
            <Route path="notifications" element={<NotificationsSettings />} />
            <Route path="custom-domains" element={<CustomDomainsSettings />} />
            <Route path="usage" element={<div>Usage settings</div>} />
          </Routes>
        </div>
        
        {/* Additional CSS for chat interface scroll prevention */}
        {activeTab === "chat-interface" && (
          <style jsx>{`
            .no-auto-scroll * {
              scroll-behavior: auto !important;
              scroll-margin: 0 !important;
              scroll-margin-top: 0 !important;
              scroll-margin-bottom: 0 !important;
            }
            
            .no-auto-scroll input:focus,
            .no-auto-scroll textarea:focus {
              scroll-behavior: auto !important;
            }
            
            .no-auto-scroll input,
            .no-auto-scroll textarea,
            .no-auto-scroll select,
            .no-auto-scroll button {
              scroll-margin: 0 !important;
              scroll-margin-top: 0 !important;
              scroll-margin-bottom: 0 !important;
            }
          `}</style>
        )}
      </div>
    </AgentPageLayout>
  );
};

export default AgentSettingsPage;
