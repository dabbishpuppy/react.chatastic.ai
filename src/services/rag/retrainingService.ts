
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';

export interface RetrainingProgress {
  agentId: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  processedSources: number;
  totalSources: number;
  processedChunks: number;
  totalChunks: number;
  progress: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export class RetrainingService {
  static async startRetraining(agentId: string): Promise<void> {
    console.log('🚀 Starting retraining for agent:', agentId);
    
    try {
      const { data, error } = await supabase.functions.invoke('start-enhanced-retraining', {
        body: { agentId }
      });

      if (error) {
        console.error('❌ Retraining failed:', error);
        throw new Error(error.message);
      }

      console.log('✅ Retraining started successfully:', data);
    } catch (error) {
      console.error('❌ Error starting retraining:', error);
      throw error;
    }
  }

  static async getProgress(agentId: string): Promise<RetrainingProgress> {
    try {
      const { data: trainingJob, error } = await supabase
        .from('agent_training_jobs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!trainingJob) {
        return {
          agentId,
          status: 'idle',
          processedSources: 0,
          totalSources: 0,
          processedChunks: 0,
          totalChunks: 0,
          progress: 0
        };
      }

      return {
        agentId,
        status: trainingJob.status,
        processedSources: trainingJob.processed_sources || 0,
        totalSources: trainingJob.total_sources || 0,
        processedChunks: trainingJob.processed_chunks || 0,
        totalChunks: trainingJob.total_chunks || 0,
        progress: trainingJob.total_sources > 0 
          ? (trainingJob.processed_sources / trainingJob.total_sources) * 100 
          : 0,
        errorMessage: trainingJob.error_message,
        startedAt: trainingJob.started_at ? new Date(trainingJob.started_at) : undefined,
        completedAt: trainingJob.completed_at ? new Date(trainingJob.completed_at) : undefined
      };
    } catch (error) {
      console.error('❌ Error fetching retraining progress:', error);
      throw error;
    }
  }

  static async stopRetraining(agentId: string): Promise<void> {
    console.log('🛑 Stopping retraining for agent:', agentId);
    // Implementation would stop the retraining process
  }
}
