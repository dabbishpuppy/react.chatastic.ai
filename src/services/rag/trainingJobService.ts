
import { supabase } from "@/integrations/supabase/client";
import { AgentTrainingJob, TrainingStatus } from "@/types/rag";

export class TrainingJobService {
  // Create a new training job
  static async createJob(data: {
    agent_id: string;
    total_sources?: number;
    total_chunks?: number;
  }): Promise<AgentTrainingJob> {
    const { data: job, error } = await supabase
      .from('agent_training_jobs')
      .insert({
        ...data,
        status: 'pending' as TrainingStatus
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create training job: ${error.message}`);
    return job;
  }

  // Update job status and progress
  static async updateJob(id: string, updates: {
    status?: TrainingStatus;
    processed_sources?: number;
    processed_chunks?: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  }): Promise<AgentTrainingJob> {
    const { data: job, error } = await supabase
      .from('agent_training_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update training job: ${error.message}`);
    return job;
  }

  // Get training jobs for an agent
  static async getJobsByAgent(agentId: string, limit: number = 10): Promise<AgentTrainingJob[]> {
    const { data: jobs, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch training jobs: ${error.message}`);
    return jobs || [];
  }

  // Get latest training job for an agent
  static async getLatestJob(agentId: string): Promise<AgentTrainingJob | null> {
    const { data: job, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch latest training job: ${error.message}`);
    }
    return job || null;
  }

  // Mark job as started
  static async startJob(id: string): Promise<AgentTrainingJob> {
    return this.updateJob(id, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }

  // Mark job as completed
  static async completeJob(id: string): Promise<AgentTrainingJob> {
    return this.updateJob(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  // Mark job as failed
  static async failJob(id: string, errorMessage: string): Promise<AgentTrainingJob> {
    return this.updateJob(id, {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    });
  }
}
