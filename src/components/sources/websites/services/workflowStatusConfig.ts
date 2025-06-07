
import { CheckCircle, AlertTriangle, Clock, Loader2, GraduationCap, RefreshCw, Trash2 } from 'lucide-react';

export interface WorkflowStatusConfig {
  icon: React.ReactNode;
  text: string;
  className: string;
  isAnimated?: boolean;
}

export const getWorkflowStatusConfig = (status: string): WorkflowStatusConfig => {
  switch (status) {
    case 'CREATED':
    case 'pending':
      return {
        icon: <Clock size={14} className="mr-1" />,
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    
    case 'CRAWLING':
    case 'in_progress':
      return {
        icon: <Loader2 size={14} className="mr-1 animate-spin" />,
        text: 'Crawling',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        isAnimated: true
      };
    
    case 'COMPLETED':
    case 'crawled':
    case 'ready_for_training':
      return {
        icon: <CheckCircle size={14} className="mr-1" />,
        text: 'Crawled',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    
    case 'TRAINING':
    case 'training':
      return {
        icon: <Loader2 size={14} className="mr-1 animate-spin" />,
        text: 'Training',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        isAnimated: true
      };
    
    case 'TRAINED':
    case 'trained':
      return {
        icon: <GraduationCap size={14} className="mr-1" />,
        text: 'Trained',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    
    case 'PENDING_REMOVAL':
    case 'pending_removal':
      return {
        icon: <Trash2 size={14} className="mr-1" />,
        text: 'Pending Removal',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    
    case 'REMOVED':
    case 'removed':
      return {
        icon: <Trash2 size={14} className="mr-1" />,
        text: 'Removed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    
    case 'ERROR':
    case 'failed':
      return {
        icon: <AlertTriangle size={14} className="mr-1" />,
        text: 'Failed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    
    case 'recrawling':
      return {
        icon: <RefreshCw size={14} className="mr-1 animate-spin" />,
        text: 'Recrawling',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        isAnimated: true
      };
    
    default:
      return {
        icon: <Clock size={14} className="mr-1" />,
        text: 'Unknown',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};
