
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ChildPageInfo from './ChildPageInfo';
import ChildPageActions from './ChildPageActions';

interface ChildPageCardProps {
  page: {
    id: string;
    url: string;
    status: string;
    created_at: string;
    completed_at?: string;
    error_message?: string;
    content_size?: number;
    chunks_created?: number;
    processing_time_ms?: number;
    parent_source_id: string;
  };
  onExclude?: (page: any) => void;
  onDelete?: (page: any) => void;
}

const ChildPageCard: React.FC<ChildPageCardProps> = ({
  page,
  onExclude,
  onDelete
}) => {
  const handleDelete = () => {
    onDelete?.(page);
  };

  return (
    <Card className="border border-gray-200 bg-white">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <ChildPageInfo
            url={page.url}
            status={page.status}
            contentSize={page.content_size}
            chunksCreated={page.chunks_created}
            processingTimeMs={page.processing_time_ms}
            errorMessage={page.error_message}
            createdAt={page.created_at}
            parentSourceId={page.parent_source_id}
            pageId={page.id}
          />
          
          <ChildPageActions
            url={page.url}
            pageId={page.id}
            parentSourceId={page.parent_source_id}
            status={page.status}
            onDelete={onDelete ? handleDelete : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ChildPageCard;
