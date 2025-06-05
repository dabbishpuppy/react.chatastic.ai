import { supabase } from "@/integrations/supabase/client";
import { RetrainingStatus } from '../types/retrainingTypes';

/**
 * Phase 9: Updated to use Enhanced Retraining Checker
 * This service now delegates to EnhancedRetrainingChecker for improved functionality
 */
export class RetrainingChecker {
  static async checkRetrainingNeeded(agentId: string): Promise<RetrainingStatus> {
    // Import and use the enhanced version
    const { EnhancedRetrainingChecker } = await import('./enhancedRetrainingChecker');
    
    // Convert enhanced result to legacy format for compatibility
    const enhancedResult = await EnhancedRetrainingChecker.checkRetrainingNeeded(agentId);
    
    return {
      needed: enhancedResult.needed,
      unprocessedSources: enhancedResult.unprocessedSources,
      reasons: enhancedResult.reasons,
      status: enhancedResult.status,
      message: enhancedResult.message,
      sourceDetails: enhancedResult.sourceDetails
    };
  }
}
