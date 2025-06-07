
import { formatDistanceToNow } from 'date-fns';

export const getFullUrl = (url: string): string => {
  return url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = bytes / Math.pow(k, i);
  const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
  
  return `${formattedSize} ${sizes[i]}`;
};

export const formatTimeAgo = (dateString: string): string => {
  const timeAgo = formatDistanceToNow(new Date(dateString), { addSuffix: true });
  
  return timeAgo
    .replace(/^about\s+0\s+\w+\s+ago$/, 'just now')
    .replace(/^0\s+\w+\s+ago$/, 'just now')
    .replace(/^about\s+/, '')
    .replace(/^less than a minute ago$/, 'just now');
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'trained': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'completed': return 'Completed';
    case 'trained': return 'Trained';
    case 'in_progress': return 'In Progress';
    case 'pending': return 'Pending';
    case 'failed': return 'Failed';
    default: return 'Unknown';
  }
};
