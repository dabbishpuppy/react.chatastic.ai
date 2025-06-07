
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
    // For child pages, we should use the source_pages status directly
    // Don't try to fetch from agent_sources table for child pages
    console.log('useChildPageStatus - using status directly:', status, 'for pageId:', pageId);
    setDisplayStatus(status);
  }, [status, pageId]);

  return {
    displayStatus,
    isLoading
  };
};
