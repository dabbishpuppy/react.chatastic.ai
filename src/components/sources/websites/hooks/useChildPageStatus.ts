
import { useState, useEffect } from 'react';

interface UseChildPageStatusProps {
  status: string;
  parentSourceId?: string;
  pageId?: string;
}

export const useChildPageStatus = ({ status, parentSourceId, pageId }: UseChildPageStatusProps) => {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // For child pages, we use the source_pages status directly
    // No need to fetch from agent_sources table for child pages since pageId != sourceId
    console.log('useChildPageStatus - using direct status for child page:', status, 'pageId:', pageId);
    setDisplayStatus(status);
  }, [status, pageId]);

  return {
    displayStatus,
    isLoading
  };
};
