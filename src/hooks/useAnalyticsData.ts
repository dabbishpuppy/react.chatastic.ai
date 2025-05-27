
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService, AnalyticsData } from '@/services/analyticsService';

export const useAnalyticsData = (
  agentId: string,
  startDate?: string,
  endDate?: string
) => {
  const {
    data: analyticsData = {
      totalChats: 0,
      totalMessages: 0,
      thumbsUp: 0,
      thumbsDown: 0
    },
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['analytics', agentId, startDate, endDate],
    queryFn: () => analyticsService.getAnalyticsData(agentId, startDate, endDate),
    enabled: !!agentId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    analyticsData,
    isLoading,
    error,
    refetch
  };
};
