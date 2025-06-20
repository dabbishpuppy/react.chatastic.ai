
import React, { useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Settings as SettingsIcon, Users, Package, CreditCard, Key, LayoutDashboard, BarChart3 } from "lucide-react";
import Logo from "@/components/layout/Logo";
import GeneralSettings from "./settings/General";
import MembersSettings from "./settings/Members";
import PlansSettings from "./settings/Plans";
import BillingSettings from "./settings/Billing";
import ApiKeysSettings from "./settings/ApiKeys";
import UsageSettings from "./settings/Usage";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect to general settings if on root settings path
  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      navigate('/settings/general', { replace: true });
    }
  }, [location.pathname, navigate]);
  
  const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/settings/general", label: "General", icon: <SettingsIcon size={18} /> },
    { to: "/settings/members", label: "Members", icon: <Users size={18} /> },
    { to: "/settings/plans", label: "Plans", icon: <Package size={18} /> },
    { to: "/settings/billing", label: "Billing", icon: <CreditCard size={18} /> },
    { to: "/settings/api-keys", label: "API Keys", icon: <Key size={18} /> },
    { to: "/settings/usage", label: "Usage", icon: <BarChart3 size={18} /> },
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
        <div className="flex-1 overflow-auto p-6 bg-[#f5f5f5]">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="general" element={<GeneralSettings />} />
              <Route path="members" element={<MembersSettings />} />
              <Route path="plans" element={<PlansSettings />} />
              <Route path="billing" element={<BillingSettings />} />
              <Route path="api-keys" element={<ApiKeysSettings />} />
              <Route path="usage" element={<UsageSettings />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
