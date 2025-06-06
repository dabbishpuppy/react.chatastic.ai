
import React from 'react';
import { Calendar, Database, FileText, ExternalLink } from 'lucide-react';
import { getFullUrl, formatTimeAgo, formatBytes } from '../utils/childPageUtils';

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
  const fullUrl = getFullUrl(url);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-900 truncate" title={fullUrl}>
          {fullUrl}
        </p>
        <ExternalLink 
          className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600 flex-shrink-0" 
          onClick={() => window.open(fullUrl, '_blank')}
        />
      </div>
      <div className="flex items-center text-xs text-gray-500 mt-1">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Crawled {formatTimeAgo(createdAt)}</span>
        </div>
        
        {(displayStatus === 'completed' || displayStatus === 'trained') && contentSize && (
          <>
            <span className="mx-2">•</span>
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>{formatBytes(contentSize)}</span>
            </div>
          </>
        )}
        
        {chunksCreated && (
          <>
            <span className="mx-2">•</span>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{chunksCreated} chunks</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChildPageDetails;
