
import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SidebarMenuItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  hasSubmenu?: boolean;
  isExpanded?: boolean;
  onClick: (e?: React.MouseEvent) => void;
  children?: React.ReactNode;
}

const SidebarMenuItem = ({
  id,
  label,
  icon,
  isActive,
  hasSubmenu = false,
  isExpanded = false,
  onClick,
  children
}: SidebarMenuItemProps) => {
  return (
    <div key={id} className="mb-1">
      <button
        className={`w-full flex items-center justify-between px-6 py-2.5 text-sm ${
          isActive
            ? "bg-gray-100 font-medium"
            : "text-gray-700 hover:bg-gray-50"
        }`}
        onClick={onClick}
      >
        <div className="flex items-center">
          <span className="mr-3 text-gray-500">{icon}</span>
          {label}
        </div>
        {hasSubmenu && (
          <span className="text-gray-500 transition-transform duration-200">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </button>
      
      {/* Submenu with transition effect */}
      {hasSubmenu && children && (
        <div 
          className={`ml-10 overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded 
              ? "max-h-64 opacity-100 mt-1 mb-2" 
              : "max-h-0 opacity-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default SidebarMenuItem;
