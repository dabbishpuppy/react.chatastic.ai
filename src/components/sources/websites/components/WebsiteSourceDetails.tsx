
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Globe, ExternalLink } from 'lucide-react';
import { formatTimeAgo, formatBytes } from '../utils/websiteUtils';
import ManualJobProcessor from './ManualJobProcessor';

interface WebsiteSourceDetailsProps {
  source: AgentSource;
}

const WebsiteSourceDetails: React.FC<WebsiteSourceDetailsProps> = ({ source }) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { variant: 'default' as const, color: 'bg-green-500' },
      'in_progress': { variant: 'secondary' as const, color: 'bg-blue-500' },
      'pending': { variant: 'outline' as const, color: 'bg-yellow-500' },
      'failed': { variant: 'destructive' as const, color: 'bg-red-500' },
      'crawled': { variant: 'default' as const, color: 'bg-purple-500' },
      'training': { variant: 'secondary' as const, color: 'bg-orange-500' },
      'trained': { variant: 'default' as const, color: 'bg-green-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: 'outline' as const, color: 'bg-gray-500' };

    return (
      <Badge variant={config.variant} className="text-white">
        <div className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4">
      {/* Manual Job Processor - Show for in_progress or failed sources */}
      {(source.crawl_status === 'in_progress' || source.crawl_status === 'failed') && (
        <ManualJobProcessor parentSourceId={source.id} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Website Source</h3>
          {getStatusBadge(source.crawl_status)}
        </div>
        <ExternalLink 
          className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
          onClick={() => window.open(source.url, '_blank')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Source Information</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">URL:</span>
              <span className="ml-2" title={source.url}>
                {truncateUrl(source.url)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">Created:</span>
              <span className="ml-1">{formatTimeAgo(source.created_at)}</span>
            </div>
            {source.last_crawled_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Last Crawled:</span>
                <span className="ml-1">{formatTimeAgo(source.last_crawled_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Progress & Statistics</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Progress:</span>
              <span className="ml-2">{source.progress || 0}%</span>
            </div>
            {source.total_jobs && (
              <div>
                <span className="text-gray-500">Total Pages:</span>
                <span className="ml-2">{source.total_jobs}</span>
              </div>
            )}
            {source.completed_jobs && (
              <div>
                <span className="text-gray-500">Completed:</span>
                <span className="ml-2">{source.completed_jobs}</span>
              </div>
            )}
            {source.failed_jobs && source.failed_jobs > 0 && (
              <div>
                <span className="text-gray-500">Failed:</span>
                <span className="ml-2 text-red-500">{source.failed_jobs}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Size Information */}
      {(source.total_content_size || source.compressed_content_size) && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Content Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {source.total_content_size && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Original Size:</span>
                <span className="ml-1">{formatBytes(source.total_content_size)}</span>
              </div>
            )}
            {source.compressed_content_size && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">Compressed:</span>
                <span className="ml-1">{formatBytes(source.compressed_content_size)}</span>
              </div>
            )}
          </div>
          {source.global_compression_ratio && source.global_compression_ratio < 1 && (
            <div className="text-sm text-gray-500 mt-1">
              Compression ratio: {(source.global_compression_ratio * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceDetails;
