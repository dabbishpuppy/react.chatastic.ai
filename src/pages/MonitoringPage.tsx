
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Users, 
  Package, 
  CreditCard, 
  Key, 
  BarChart3, 
  Monitor 
} from "lucide-react";

const MonitoringPage = () => {
  const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/settings/general", label: "General", icon: <SettingsIcon size={18} /> },
    { to: "/settings/members", label: "Members", icon: <Users size={18} /> },
    { to: "/settings/plans", label: "Plans", icon: <Package size={18} /> },
    { to: "/settings/billing", label: "Billing", icon: <CreditCard size={18} /> },
    { to: "/settings/api-keys", label: "API Keys", icon: <Key size={18} /> },
    { to: "/settings/usage", label: "Usage", icon: <BarChart3 size={18} /> },
    { to: "/monitoring", label: "Monitoring", icon: <Monitor size={18} /> },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-200">
            <Logo size="md" />
          </div>
          <nav className="p-4">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2.5 my-1 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <span className="mr-3 text-gray-500">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto bg-[#f5f5f5]">
          <MonitoringDashboard />
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
