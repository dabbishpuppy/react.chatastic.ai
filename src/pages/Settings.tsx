
import React, { useState } from "react";
import { useNavigate, useParams, Outlet } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Users, CreditCard, KeyRound, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Settings = () => {
  const { tab = "general" } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("settings");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "agents") {
      navigate("/dashboard");
    } else if (tab === "usage") {
      navigate("/dashboard", { state: { activeTab: "usage" } });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold">
              <span className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded">C</div>
                Wonderwave
              </span>
            </Link>
            <div className="hidden md:block ml-8">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      className={`${navigationMenuTriggerStyle()} ${activeTab === "agents" ? "bg-accent/50" : ""}`}
                      onClick={() => handleTabChange("agents")}
                    >
                      Agents
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      className={`${navigationMenuTriggerStyle()} ${activeTab === "usage" ? "bg-accent/50" : ""}`}
                      onClick={() => handleTabChange("usage")}
                    >
                      Usage
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      className={`${navigationMenuTriggerStyle()} ${activeTab === "settings" ? "bg-accent/50" : ""}`}
                      onClick={() => handleTabChange("settings")}
                    >
                      Settings
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="#docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
            <Link to="#help" className="text-gray-600 hover:text-gray-900">Help</Link>
            <Link to="#changelog" className="text-gray-600 hover:text-gray-900">Changelog</Link>
            <Avatar>
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 space-y-2">
            <Link 
              to="/settings/general" 
              className={`flex items-center gap-2 p-3 rounded-md hover:bg-accent ${tab === "general" ? "bg-accent" : ""}`}
            >
              <SettingsIcon className="h-5 w-5" />
              <span>General</span>
            </Link>
            <Link 
              to="/settings/members" 
              className={`flex items-center gap-2 p-3 rounded-md hover:bg-accent ${tab === "members" ? "bg-accent" : ""}`}
            >
              <Users className="h-5 w-5" />
              <span>Members</span>
            </Link>
            <Link 
              to="/settings/plans" 
              className={`flex items-center gap-2 p-3 rounded-md hover:bg-accent ${tab === "plans" ? "bg-accent" : ""}`}
            >
              <Package className="h-5 w-5" />
              <span>Plans</span>
            </Link>
            <Link 
              to="/settings/billing" 
              className={`flex items-center gap-2 p-3 rounded-md hover:bg-accent ${tab === "billing" ? "bg-accent" : ""}`}
            >
              <CreditCard className="h-5 w-5" />
              <span>Billing</span>
            </Link>
            <Link 
              to="/settings/api-keys" 
              className={`flex items-center gap-2 p-3 rounded-md hover:bg-accent ${tab === "api-keys" ? "bg-accent" : ""}`}
            >
              <KeyRound className="h-5 w-5" />
              <span>API Keys</span>
            </Link>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
