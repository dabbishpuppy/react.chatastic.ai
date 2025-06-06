
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, EyeOff, ExternalLink } from 'lucide-react';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';

interface ChildPageCardProps {
  page: {
    id: string;
    url: string;
    status: string;
    processing_status?: string;
    created_at: string;
    completed_at?: string;
    error_message?: string;
    content_size?: number;
    chunks_created?: number;
    processing_time_ms?: number;
  };
  onExclude: (page: any) => void;
  onDelete: (page: any) => void;
}

const ChildPageCard: React.FC<ChildPageCardProps> = ({
  page,
  onExclude,
  onDelete
}) => {
  const handleExclude = () => {
    onExclude(page);
  };

  const handleDelete = () => {
    onDelete(page);
  };

  const openInNewTab = () => {
    window.open(page.url, '_blank');
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <WebsiteSourceStatusBadges
                crawlStatus={page.status}
                isExcluded={false}
                linksCount={0}
                sourceId={page.id}
                isChildSource={true}
                processingStatus={page.processing_status}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={openInNewTab}
                className="p-1 h-6 w-6"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 truncate mb-1" title={page.url}>
              {page.url}
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              {page.content_size && (
                <div>Size: {formatFileSize(page.content_size)}</div>
              )}
              {page.chunks_created && (
                <div>Chunks: {page.chunks_created}</div>
              )}
              {page.processing_time_ms && (
                <div>Processing: {formatProcessingTime(page.processing_time_ms)}</div>
              )}
              {page.error_message && (
                <div className="text-red-500 text-xs truncate" title={page.error_message}>
                  Error: {page.error_message}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExclude}
              className="p-1 h-6 w-6"
              title="Exclude page"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
              title="Delete page"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChildPageCard;
