
import React from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Users, 
  CreditCard, 
  Package, 
  Key, 
  BarChart3 
} from "lucide-react";

const Settings = () => {
  const location = useLocation();
  
  // If we're at the base /settings route, redirect to /settings/general
  if (location.pathname === '/settings') {
    return <Navigate to="/settings/general" replace />;
  }

  const settingsNavItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      path: "/dashboard"
    },
    {
      icon: <SettingsIcon size={20} />,
      label: "General",
      path: "/settings/general"
    },
    {
      icon: <Users size={20} />,
      label: "Members",
      path: "/settings/members"
    },
    {
      icon: <Package size={20} />,
      label: "Plans",
      path: "/settings/plans"
    },
    {
      icon: <CreditCard size={20} />,
      label: "Billing",
      path: "/settings/billing"
    },
    {
      icon: <Key size={20} />,
      label: "API Keys",
      path: "/settings/api-keys"
    },
    {
      icon: <BarChart3 size={20} />,
      label: "Usage",
      path: "/settings/usage"
    }
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          
          <nav className="flex-1 px-4 pb-4 space-y-1">
            {settingsNavItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActiveRoute(item.path)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
