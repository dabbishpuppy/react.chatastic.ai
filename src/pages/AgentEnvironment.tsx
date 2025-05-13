import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import TopNavBar from "@/components/layout/TopNavBar";

const AgentEnvironment = () => {
  const { agentId } = useParams();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("playground");
  const [chatHistory, setChatHistory] = useState([
    {
      isAgent: true,
      content: "👋 Hi! I'm Wonder AI. How can I help you today?",
      timestamp: new Date().toISOString()
    }
  ]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message to chat history
    setChatHistory([...chatHistory, {
      isAgent: false,
      content: message,
      timestamp: new Date().toISOString()
    }]);
    
    // Clear message input
    setMessage("");
    
    // Simulate agent response (would be replaced with actual API call)
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        isAgent: true,
        content: "I'm an AI assistant. I'm here to help you with any questions or tasks!",
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      {/* Sidebar + Main content */}
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen bg-background overflow-hidden">
          {/* Left Navigation Sidebar */}
          <Sidebar>
            <SidebarContent>
              <div className="mb-4 p-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="search"
                    placeholder="Search team..."
                    className="w-full border border-gray-200 py-2 pl-8 pr-4 rounded-md focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="mb-4 px-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Teams</h3>
                <div className="bg-gray-100 px-3 py-2 rounded-md flex items-center justify-between font-medium">
                  <span>Wonderwave</span>
                  <span>✓</span>
                </div>
              </div>

              <div className="px-4 mb-4">
                <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
                  <Plus className="h-4 w-4" />
                  <span>Create team</span>
                </Button>
              </div>

              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "playground"} onClick={() => handleTabChange("playground")}>
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
                      </svg>
                      Playground
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "activity"} onClick={() => handleTabChange("activity")}>
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M14 2v12H2V2h12zm0-2H2C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V2c0-1.1-0.9-2-2-2z" />
                        <path d="M4 10h8V6H4v4zm0 2h5v-1H4v1zm0-7h5V4H4v1z" />
                      </svg>
                      Activity
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "analytics"} onClick={() => handleTabChange("analytics")}>
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M14 0H2C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V2c0-1.1-0.9-2-2-2zm-1 14H3c-0.6 0-1-0.4-1-1V3c0-0.6 0.4-1 1-1h10c0.6 0 1 0.4 1 1v10c0 0.6-0.4 1-1 1z" />
                        <path d="M11.5 4h-7C4.2 4 4 4.2 4 4.5S4.2 5 4.5 5h7C11.8 5 12 4.8 12 4.5S11.8 4 11.5 4z" />
                        <path d="M11.5 7h-7C4.2 7 4 7.2 4 7.5S4.2 8 4.5 8h7C11.8 8 12 7.8 12 7.5S11.8 7 11.5 7z" />
                        <path d="M11.5 10h-7c-0.3 0-0.5 0.2-0.5 0.5s0.2 0.5 0.5 0.5h7c0.3 0 0.5-0.2 0.5-0.5s-0.2-0.5-0.5-0.5z" />
                      </svg>
                      Analytics
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "sources"} onClick={() => handleTabChange("sources")}>
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
                        <path d="M7 3h2v2H7z" />
                        <path d="M7 7h2v6H7z" />
                      </svg>
                      Sources
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "actions"} onClick={() => handleTabChange("actions")}>
                    <span className="flex items-center gap-2 relative">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
                        <path d="M12 7H9V4c0-0.6-0.4-1-1-1S7 3.4 7 4v3H4c-0.6 0-1 0.4-1 1s0.4 1 1 1h3v3c0 0.6 0.4 1 1 1s1-0.4 1-1V9h3c0.6 0 1-0.4 1-1s-0.4-1-1-1z" />
                      </svg>
                      Actions
                      <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[8px] font-medium text-white">
                        New
                      </span>
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "contacts"} onClick={() => handleTabChange("contacts")}>
                    <span className="flex items-center gap-2 relative">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
                        <circle cx="8" cy="4" r="2" />
                        <path d="M8 8c-2.2 0-4 1.8-4 4h8c0-2.2-1.8-4-4-4z" />
                      </svg>
                      Contacts
                      <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[8px] font-medium text-white">
                        New
                      </span>
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "connect"} onClick={() => handleTabChange("connect")}>
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
                        <path d="M7 3h2v4h4v2h-4v4h-2v-4h-4v-2h4v-4z" />
                      </svg>
                      Connect
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "settings"} onClick={() => handleTabChange("settings")}>
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M14 0H2C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V2c0-1.1-0.9-2-2-2zm-1 14H3c-0.6 0-1-0.4-1-1V3c0-0.6 0.4-1 1-1h10c0.6 0 1 0.4 1 1v10c0 0.6-0.4 1-1 1z" />
                        <circle cx="8" cy="8" r="2" />
                      </svg>
                      Settings
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Chat Container */}
            <div className="flex-1 flex flex-col bg-gray-50 p-4 overflow-auto" style={{ backgroundSize: "20px 20px", backgroundImage: "radial-gradient(circle, #d0d0d0 1px, rgba(0, 0, 0, 0) 1px)" }}>
              <Card className="mx-auto w-full max-w-3xl h-full bg-white overflow-hidden flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 bg-violet-600">
                      <AvatarImage src="/placeholder.svg" alt="Agent" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">AI Customer Service</span>
                  </div>
                  <Button size="icon" variant="ghost">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </Button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex mb-4 ${msg.isAgent ? '' : 'justify-end'}`}>
                      {msg.isAgent && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src="/placeholder.svg" alt="Agent" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-lg p-3 max-w-[80%] ${
                        msg.isAgent ? 'bg-gray-100' : 'bg-primary text-primary-foreground'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write message here..."
                    className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button type="submit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AgentEnvironment;
