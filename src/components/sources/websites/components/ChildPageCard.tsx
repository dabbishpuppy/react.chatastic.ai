
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ChildPageInfo from './ChildPageInfo';
import ChildPageActions from './ChildPageActions';

interface SourcePage {
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
}

interface ChildPageCardProps {
  page: SourcePage;
  onExclude: (source: any) => void;
  onDelete: (source: any) => void;
}

const ChildPageCard: React.FC<ChildPageCardProps> = ({
  page,
  onExclude,
  onDelete
}) => {
  const handleExclude = () => {
    onExclude({ ...page, source_type: 'website' });
  };

  const handleDelete = () => {
    onDelete({ ...page, source_type: 'website' });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <ChildPageInfo
            url={page.url}
            status={page.status}
            contentSize={page.content_size}
            chunksCreated={page.chunks_created}
            errorMessage={page.error_message}
            createdAt={page.created_at}
          />
          
          <ChildPageActions
            url={page.url}
            onExclude={handleExclude}
            onDelete={handleDelete}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ChildPageCard;
