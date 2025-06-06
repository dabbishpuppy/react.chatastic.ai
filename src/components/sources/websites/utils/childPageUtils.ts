
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
    case 'completed': return 'bg-green-500 text-white';
    case 'trained': return 'bg-purple-500 text-white';
    case 'in_progress': return 'bg-blue-500 text-white';
    case 'pending': return 'bg-yellow-500 text-white';
    case 'failed': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
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
