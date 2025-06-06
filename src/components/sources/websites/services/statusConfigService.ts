
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
        icon: <Clock size={14} className="mr-1" />,
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    case 'in_progress':
      return {
        icon: <Loader2 size={14} className="mr-1 animate-spin" />,
        text: 'Crawling',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'recrawling':
      return {
        icon: <RefreshCw size={14} className="mr-1 animate-spin" />,
        text: 'Recrawling',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    case 'ready_for_training':
      return {
        icon: <CheckCircle size={14} className="mr-1" />,
        text: 'Ready for Training',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'training':
      return {
        icon: <Loader2 size={14} className="mr-1 animate-spin" />,
        text: 'Training',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'trained':
      return {
        icon: <GraduationCap size={14} className="mr-1" />,
        text: 'Trained',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'failed':
      return {
        icon: <AlertTriangle size={14} className="mr-1" />,
        text: 'Failed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    default:
      return {
        icon: <Clock size={14} className="mr-1" />,
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};
