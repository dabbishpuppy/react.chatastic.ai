
export interface WorkflowStatusConfig {
  iconName: string;
  text: string;
  className: string;
  isAnimated?: boolean;
}

export const getWorkflowStatusConfig = (status: string): WorkflowStatusConfig => {
  switch (status) {
    case 'CREATED':
    case 'pending':
      return {
        iconName: 'Clock',
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    
    case 'CRAWLING':
    case 'in_progress':
      return {
        iconName: 'Loader2',
        text: 'Crawling',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        isAnimated: true
      };
    
    case 'COMPLETED':
    case 'crawled':
    case 'ready_for_training':
      return {
        iconName: 'CheckCircle',
        text: 'Crawled',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    
    case 'TRAINING':
    case 'training':
      return {
        iconName: 'Loader2',
        text: 'Training',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        isAnimated: true
      };
    
    case 'TRAINED':
    case 'trained':
      return {
        iconName: 'GraduationCap',
        text: 'Trained',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    
    case 'PENDING_REMOVAL':
    case 'pending_removal':
      return {
        iconName: 'Trash2',
        text: 'Pending Removal',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      };
    
    case 'REMOVED':
    case 'removed':
      return {
        iconName: 'Trash2',
        text: 'Removed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    
    case 'ERROR':
    case 'failed':
      return {
        iconName: 'AlertTriangle',
        text: 'Failed',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    
    case 'recrawling':
      return {
        iconName: 'RefreshCw',
        text: 'Recrawling',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        isAnimated: true
      };
    
    default:
      return {
        iconName: 'Clock',
        text: 'Unknown',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
  }
};
