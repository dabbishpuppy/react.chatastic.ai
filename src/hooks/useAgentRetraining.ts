import { useState, useCallback, useEffect, useRef } from 'react';
import { RetrainingService, type RetrainingProgress } from '@/services/rag/retrainingService';
import { useToast } from '@/hooks/use-toast';
import { useTrainingNotifications } from '@/hooks/useTrainingNotifications';

/**
 * Phase 9: Updated to use Enhanced Agent Retraining
 * This hook now delegates to useEnhancedAgentRetraining for improved functionality
 */
export const useAgentRetraining = (agentId?: string) => {
  // Import and use the enhanced version
  const enhancedHook = require('./useEnhancedAgentRetraining').useEnhancedAgentRetraining;
  
  return enhancedHook(agentId);
};
