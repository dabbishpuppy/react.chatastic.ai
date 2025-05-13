
import React from "react";
import { useParams, Outlet } from "react-router-dom";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Users, CreditCard, KeyRound, Package } from "lucide-react";
import TopNavBar from "@/components/layout/TopNavBar";

const Settings = () => {
  const { tab = "general" } = useParams();

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5]">
      <TopNavBar />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 space-y-2 bg-white p-4 rounded-lg">
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
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
