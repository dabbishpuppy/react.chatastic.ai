
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2, GraduationCap, RotateCcw } from 'lucide-react';

export const getStatusConfig = (status: string) => {
  // Ensure we handle any status gracefully with proper logging
  const normalizedStatus = status?.toLowerCase() || 'pending';
  console.log('🎨 Getting status config for:', normalizedStatus, 'from original:', status);
  
  switch (normalizedStatus) {
    case 'pending':
      return {
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Clock className="w-3 h-3 mr-1" />
      };
    case 'in_progress':
      return {
        text: 'In Progress',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      };
    case 'recrawling':
      return {
        text: 'Recrawling',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
      };
    case 'completed':
      return {
        text: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3 mr-1" />
      };
    case 'ready_for_training':
      return {
        text: 'Ready for Training',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <GraduationCap className="w-3 h-3 mr-1" />
      };
    case 'training':
      return {
        text: 'Training',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      };
    case 'trained':
      return {
        text: 'Trained',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <GraduationCap className="w-3 h-3 mr-1" />
      };
    case 'failed':
      return {
        text: 'Failed',
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="w-3 h-3 mr-1" />
      };
    default:
      // Enhanced fallback with better logging
      console.warn(`⚠️ Unknown status received: "${status}" (normalized: "${normalizedStatus}"), defaulting to pending`);
      return {
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Clock className="w-3 h-3 mr-1" />
      };
  }
};
