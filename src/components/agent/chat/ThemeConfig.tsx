
import React from "react";

export interface ThemeClasses {
  agentBubble: string;
  userBubble: string;
  background: string;
  text: string;
  inputBg: string;
  inputText: string;
  iconButton: string;
  footerBg: string;
}

export const getThemeClasses = (theme: 'light' | 'dark' | 'system'): ThemeClasses => ({
  agentBubble: theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-gray-100',
  userBubble: theme === 'dark' ? 'bg-blue-900 text-white' : 'bg-primary text-primary-foreground',
  background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
  text: theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
  inputBg: theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
  inputText: theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
  iconButton: theme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800',
  footerBg: theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-t text-gray-500',
});

// Helper function to determine contrasting text color for a background
export function getContrastColor(hex: string): string {
  let r = 0, g = 0, b = 0;
  
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
