
import React from 'react';
import { useChildPageStatus } from '../hooks/useChildPageStatus';
import ChildPageUrl from './ChildPageUrl';
import ChildPageMetadata from './ChildPageMetadata';
import ChildPageStatusBadge from './ChildPageStatusBadge';

interface ChildPageInfoProps {
  url: string;
  status: string;
  contentSize?: number;
  chunksCreated?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  parentSourceId?: string;
  pageId?: string;
}

const ChildPageInfo: React.FC<ChildPageInfoProps> = ({
  url,
  status,
  contentSize,
  chunksCreated,
  errorMessage,
  createdAt,
  parentSourceId,
  pageId
}) => {
  const { displayStatus, parentTrainingState, childProcessingStatus } = useChildPageStatus({
    status,
    parentSourceId,
    pageId
  });

  console.log('ChildPageInfo - displayStatus:', displayStatus, 'originalStatus:', status, 'processingStatus:', childProcessingStatus, 'parentState:', parentTrainingState);

  return (
    <>
      <div className="flex-1 min-w-0">
        <ChildPageUrl url={url} />
        <ChildPageMetadata
          createdAt={createdAt}
          displayStatus={displayStatus}
          contentSize={contentSize}
          chunksCreated={chunksCreated}
        />
      </div>
      
      <ChildPageStatusBadge displayStatus={displayStatus} />

      {errorMessage && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          Error: {errorMessage}
        </div>
      )}
    </>
  );
};

export default ChildPageInfo;
