
import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock, GraduationCap, RefreshCw } from 'lucide-react';

export interface StatusConfig {
  icon: React.ReactElement;
  text: string;
  className: string;
}

export const getStatusConfig = (currentStatus: string): StatusConfig => {
  switch (currentStatus) {
    case 'pending':
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    case 'crawling':
    case 'in_progress':
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'In Progress',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'recrawling':
      return {
        icon: React.createElement(RefreshCw, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Recrawling',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    case 'crawled':
      return {
        icon: React.createElement(CheckCircle, { size: 14, className: "mr-1" }),
        text: 'Ready for Training',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    case 'training':
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Training',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'trained':
    case 'training_completed':
      return {
        icon: React.createElement(GraduationCap, { size: 14, className: "mr-1" }),
        text: 'Trained',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'completed':
      return {
        icon: React.createElement(CheckCircle, { size: 14, className: "mr-1" }),
        text: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'ready_for_training':
      return {
        icon: React.createElement(CheckCircle, { size: 14, className: "mr-1" }),
        text: 'Ready for Training',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    case 'failed':
      return {
        icon: React.createElement(AlertTriangle, { size: 14, className: "mr-1" }),
        text: 'Failed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    default:
      return {
        icon: React.createElement(Loader2, { size: 14, className: "mr-1 animate-spin" }),
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};
