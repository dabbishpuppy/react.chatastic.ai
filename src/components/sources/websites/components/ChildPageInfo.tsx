
import React from 'react';
import { useChildPageStatus } from '../hooks/useChildPageStatus';
import ChildPageDetails from './ChildPageDetails';
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
  const { displayStatus, isLoading } = useChildPageStatus({
    status,
    parentSourceId,
    pageId
  });

  console.log('ChildPageInfo - displayStatus:', displayStatus, 'originalStatus:', status, 'pageId:', pageId);

  return (
    <>
      <ChildPageDetails
        url={url}
        createdAt={createdAt}
        contentSize={contentSize}
        chunksCreated={chunksCreated}
        displayStatus={displayStatus}
      />
      
      <div className="flex items-center gap-2">
        <ChildPageStatusBadge
          status={displayStatus}
          isLoading={isLoading}
        />
      </div>

      {errorMessage && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          Error: {errorMessage}
        </div>
      )}
    </>
  );
};

export default ChildPageInfo;
