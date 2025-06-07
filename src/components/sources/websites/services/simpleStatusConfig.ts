
import React from 'react';
import { Loader2, CheckCircle, GraduationCap, RefreshCw, Restore } from 'lucide-react';

export interface SimpleStatusConfig {
  icon: React.ReactElement;
  text: string;
  className: string;
}

export const getSimpleStatusConfig = (status: string): SimpleStatusConfig => {
  switch (status) {
    case 'crawling':
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Crawling',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'completed':
      return {
        icon: React.createElement(CheckCircle, { size: 14, className: "mr-1" }),
        text: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'training':
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Training',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'trained':
      return {
        icon: React.createElement(GraduationCap, { size: 14, className: "mr-1" }),
        text: 'Trained',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'removed':
      return {
        icon: React.createElement(RefreshCw, { size: 14, className: "mr-1" }),
        text: 'Removed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    default:
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Crawling',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
  }
};
