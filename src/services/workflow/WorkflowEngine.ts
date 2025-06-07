
import { supabase } from '@/integrations/supabase/client';
import { SourceStatus, PageStatus, WorkflowEvent, BackgroundJob } from './types';

export class WorkflowEngine {
  /**
   * Transition a source to a new status with event emission
   */
  static async transitionSourceStatus(
    sourceId: string,
    newStatus: SourceStatus,
    eventType: string = 'STATUS_CHANGE',
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    console.log(`🔄 Transitioning source ${sourceId} to status: ${newStatus}`);
    
    const { data, error } = await supabase.rpc('transition_source_status', {
      p_source_id: sourceId,
      p_new_status: newStatus,
      p_event_type: eventType,
      p_metadata: metadata
    });

    if (error) {
      console.error('❌ Error transitioning source status:', error);
      throw error;
    }

    console.log(`✅ Source ${sourceId} transitioned to ${newStatus}`);
    return data;
  }

  /**
   * Transition a page to a new status with event emission
   */
  static async transitionPageStatus(
    pageId: string,
    newStatus: PageStatus,
    eventType: string = 'PAGE_STATUS_CHANGE',
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    console.log(`🔄 Transitioning page ${pageId} to status: ${newStatus}`);
    
    const { data, error } = await supabase.rpc('transition_page_status', {
      p_page_id: pageId,
      p_new_status: newStatus,
      p_event_type: eventType,
      p_metadata: metadata
    });

    if (error) {
      console.error('❌ Error transitioning page status:', error);
      throw error;
    }

    console.log(`✅ Page ${pageId} transitioned to ${newStatus}`);
    return data;
  }

  /**
   * Enqueue a background job
   */
  static async enqueueJob(
    jobType: string,
    sourceId: string,
    pageId?: string,
    jobKey?: string,
    payload: Record<string, any> = {},
    priority: number = 100
  ): Promise<string> {
    console.log(`📋 Enqueuing job: ${jobType} for source ${sourceId}`);
    
    const { data, error } = await supabase.rpc('enqueue_job', {
      p_job_type: jobType,
      p_source_id: sourceId,
      p_page_id: pageId,
      p_job_key: jobKey,
      p_payload: payload,
      p_priority: priority
    });

    if (error) {
      console.error('❌ Error enqueuing job:', error);
      throw error;
    }

    console.log(`✅ Job ${jobType} enqueued with ID: ${data}`);
    return data;
  }

  /**
   * Get workflow events for a source
   */
  static async getWorkflowEvents(sourceId: string): Promise<WorkflowEvent[]> {
    const { data, error } = await supabase
      .from('workflow_events')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching workflow events:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get background jobs for a source
   */
  static async getBackgroundJobs(sourceId: string): Promise<BackgroundJob[]> {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching background jobs:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update job status
   */
  static async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'processing') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('background_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('❌ Error updating job status:', error);
      throw error;
    }
  }
}
