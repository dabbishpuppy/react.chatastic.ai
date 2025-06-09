
import React from 'react';
import { formatTimeAgo, formatBytes } from '../utils/websiteUtils';

interface ChildPageDetailsProps {
  url: string;
  createdAt: string;
  contentSize?: number;
  chunksCreated?: number;
  displayStatus: string;
}

const ChildPageDetails: React.FC<ChildPageDetailsProps> = ({
  url,
  createdAt,
  contentSize,
  chunksCreated,
  displayStatus
}) => {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
        >
          {url}
        </a>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Crawled {formatTimeAgo(createdAt)}</span>
        
        {contentSize && contentSize > 0 && (
          <span className="flex items-center gap-1">
            <span>•</span>
            <span className="font-medium">{formatBytes(contentSize)}</span>
          </span>
        )}
        
        {chunksCreated && chunksCreated > 0 && (
          <span className="flex items-center gap-1">
            <span>•</span>
            <span>{chunksCreated} chunks</span>
          </span>
        )}
        
        {!contentSize && !chunksCreated && displayStatus === 'completed' && (
          <span className="text-yellow-600">• No content extracted</span>
        )}
      </div>
    </div>
  );
};

export default ChildPageDetails;
