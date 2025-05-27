
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService, AnalyticsData } from '@/services/analyticsService';

export const useAnalyticsData = (
  agentId: string,
  startDate?: string,
  endDate?: string
) => {
  console.log('📊 useAnalyticsData called with:', { agentId, startDate, endDate });
  
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
    queryFn: () => {
      console.log('📊 Fetching analytics for agent:', agentId);
      return analyticsService.getAnalyticsData(agentId, startDate, endDate);
    },
    enabled: !!agentId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  console.log('📊 Analytics data result:', { analyticsData, isLoading, error });

  return {
    analyticsData,
    isLoading,
    error,
    refetch
  };
};
