
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Globe, FileText, Hash, ArrowRight } from 'lucide-react';
import { formatTimeAgo, formatBytes } from '../utils/websiteUtils';
import ManualJobProcessor from './ManualJobProcessor';
import { useSourcePagesPaginated } from '@/hooks/useSourcePagesPaginated';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

interface WebsiteSourceDetailsProps {
  source: AgentSource;
}

const WebsiteSourceDetails: React.FC<WebsiteSourceDetailsProps> = ({ source }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  
  const { data: pagesData, isLoading: pagesLoading } = useSourcePagesPaginated({
    parentSourceId: source.id,
    page: 1,
    pageSize: 10,
    enabled: true
  });

  const handlePageClick = (pageId: string) => {
    navigate(`/agent/${agentId}/sources/page/${pageId}`);
  };

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

      {/* Child Pages Section */}
      {pagesData && pagesData.pages.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">
              Child Pages ({pagesData.totalCount})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pagesData.pages.map((page) => (
                <div 
                  key={page.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePageClick(page.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {page.url}
                    </div>
                    <div className="text-xs text-gray-500">
                      {page.status} • {page.content_size ? formatBytes(page.content_size) : 'No content'}
                      {page.chunks_created && ` • ${page.chunks_created} chunks`}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {pagesData.totalCount > 10 && (
              <div className="text-xs text-gray-500 text-center">
                Showing first 10 of {pagesData.totalCount} pages
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WebsiteSourceDetails;
