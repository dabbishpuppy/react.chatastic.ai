
import React from "react";

interface SidebarSubmenuItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (event?: React.MouseEvent) => void;
}

const SidebarSubmenuItem = ({
  id,
  label,
  icon,
  isActive,
  onClick
}: SidebarSubmenuItemProps) => {
  return (
    <button
      key={id}
      className={`w-full text-left py-2 px-3 text-sm rounded-md flex items-center transition-colors duration-200 ${
        isActive
          ? "bg-gray-100 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`}
      onClick={(e) => {
        e.stopPropagation(); // Stop event bubbling to parent
        onClick(e);
      }}
    >
      <span className="mr-2 text-gray-500">{icon}</span>
      {label}
    </button>
  );
};

export default SidebarSubmenuItem;
