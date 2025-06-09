
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Globe, FileText, Hash } from 'lucide-react';
import { formatTimeAgo, formatBytes } from '../utils/websiteUtils';
import ManualJobProcessor from './ManualJobProcessor';

interface WebsiteSourceDetailsProps {
  source: AgentSource;
}

const WebsiteSourceDetails: React.FC<WebsiteSourceDetailsProps> = ({ source }) => {
  return (
    <div className="space-y-4">
      {/* Manual Job Processor */}
      <ManualJobProcessor parentSourceId={source.id} />
      
      <Separator />

      {/* Source Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="font-medium">URL:</span>
          </div>
          <p className="text-gray-600 break-all">{source.url}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Last Updated:</span>
          </div>
          <p className="text-gray-600">
            {source.updated_at ? formatTimeAgo(source.updated_at) : 'Never'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Links Found:</span>
          </div>
          <p className="text-gray-600">{source.links_count || 0}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Size:</span>
          </div>
          <p className="text-gray-600">
            {source.total_content_size ? formatBytes(source.total_content_size) : 'Unknown'}
          </p>
        </div>
      </div>

      {/* Status Information */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Status</h4>
        <div className="flex gap-2">
          <Badge variant={source.crawl_status === 'completed' ? 'default' : 'secondary'}>
            {source.crawl_status || 'Unknown'}
          </Badge>
          {source.is_excluded && (
            <Badge variant="destructive">Excluded</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsiteSourceDetails;
