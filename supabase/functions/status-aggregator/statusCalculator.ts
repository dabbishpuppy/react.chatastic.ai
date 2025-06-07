
import { ParentSource, SourcePage } from './types.ts';

export class StatusCalculator {
  static determineStatus(
    parentSource: ParentSource,
    totalJobs: number,
    completedJobs: number,
    failedJobs: number,
    pendingJobs: number,
    inProgressJobs: number,
    eventType?: string
  ): string {
    let status = parentSource.crawl_status;
    const isRecrawling = parentSource.metadata?.is_recrawling === true;
    const metadata = parentSource.metadata || {};

    console.log(`🔍 Status calculation - eventType: ${eventType}, current status: ${status}, isRecrawling: ${isRecrawling}`);
    console.log(`📊 Job breakdown - Total: ${totalJobs}, Completed: ${completedJobs}, Failed: ${failedJobs}, Pending: ${pendingJobs}, InProgress: ${inProgressJobs}`);

    // Special handling for training completion events - FIXED: Handle both event types
    if (eventType === 'training_completion_metadata_update' || 
        eventType === 'training_completed' || 
        eventType === 'training_complete') {
      console.log('🎓 Training completion event detected - setting to trained status');
      
      // For training completion, always set to 'trained' regardless of current status
      if (metadata.training_completed_at || metadata.last_trained_at) {
        console.log('✅ Setting status to trained after training completion');
        return 'trained';
      }
      
      // If training metadata exists but status isn't updated yet, set to trained
      if (status === 'training' || status === 'ready_for_training' || status === 'completed') {
        console.log('🎓 Setting status to trained based on training completion event');
        return 'trained';
      }
    }

    if (isRecrawling) {
      console.log('🔄 Processing recrawl logic...');
      
      if (totalJobs === 0) {
        status = 'recrawling';
        console.log('🔄 No jobs found, maintaining recrawling status');
      } else if (inProgressJobs > 0 || pendingJobs > 0) {
        status = 'recrawling';
        console.log(`🔄 Still processing (pending: ${pendingJobs}, inProgress: ${inProgressJobs}), maintaining recrawling status`);
      } else if (completedJobs + failedJobs === totalJobs && totalJobs > 0) {
        if (completedJobs > 0) {
          status = 'ready_for_training';
          console.log('✅ All recrawl jobs completed, setting to ready_for_training');
        } else {
          status = 'failed';
          console.log('❌ All recrawl jobs failed, setting to failed');
        }
      } else {
        status = 'recrawling';
        console.log('🔄 Default case during recrawl, maintaining recrawling status');
      }
    } else {
      console.log('📝 Processing normal crawl logic...');
      
      if (totalJobs === 0) {
        status = 'pending';
        console.log('📋 No jobs yet, setting to pending');
      } else if (pendingJobs > 0 || inProgressJobs > 0) {
        // FIXED: If there are still pending or in-progress jobs, stay in in_progress
        if (completedJobs > 0 || failedJobs > 0) {
          status = 'in_progress';
          console.log(`🔄 Some jobs completed but ${pendingJobs} pending and ${inProgressJobs} in progress remain, setting to in_progress`);
        } else {
          status = 'pending';
          console.log('📋 All jobs pending, setting to pending');
        }
      } else if (completedJobs + failedJobs === totalJobs && totalJobs > 0) {
        // FIXED: Only move to ready_for_training when ALL jobs are done AND we have successful completions
        if (completedJobs > 0) {
          status = 'ready_for_training';
          console.log(`✅ All ${totalJobs} jobs finished with ${completedJobs} completed, setting to ready_for_training`);
        } else {
          status = 'failed';
          console.log('❌ All jobs failed, setting to failed');
        }
      } else {
        // This shouldn't happen, but default to in_progress if we have any activity
        status = 'in_progress';
        console.log('🔄 Unexpected state, defaulting to in_progress');
      }
    }

    console.log(`📊 Status decision - Old: ${parentSource.crawl_status}, New: ${status}, Event: ${eventType}`);
    return status;
  }

  static calculateProgress(totalJobs: number, completedJobs: number, failedJobs: number): number {
    return totalJobs > 0 ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100) : 0;
  }
}
