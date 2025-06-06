
import React from 'react';
import { Calendar, Database, FileText } from 'lucide-react';
import { formatTimeAgo, formatBytes } from '../utils/childPageUtils';

interface ChildPageMetadataProps {
  createdAt: string;
  displayStatus: string;
  contentSize?: number;
  chunksCreated?: number;
}

const ChildPageMetadata: React.FC<ChildPageMetadataProps> = ({
  createdAt,
  displayStatus,
  contentSize,
  chunksCreated
}) => {
  return (
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
  );
};

export default ChildPageMetadata;
