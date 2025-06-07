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
    console.log(`📊 Job stats - total: ${totalJobs}, completed: ${completedJobs}, failed: ${failedJobs}, pending: ${pendingJobs}, inProgress: ${inProgressJobs}`);

    // Special handling for training completion events
    if (eventType === 'training_completion_metadata_update' || 
        eventType === 'training_completed' || 
        eventType === 'training_complete') {
      console.log('🎓 Training completion event detected - setting to trained status');
      
      if (metadata.training_completed_at || metadata.last_trained_at) {
        console.log('✅ Setting status to trained after training completion');
        return 'trained';
      }
      
      if (status === 'training' || status === 'ready_for_training' || status === 'completed') {
        console.log('🎓 Setting status to trained based on training completion event');
        return 'trained';
      }
    }

    // Handle recrawling logic
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
      }
    } else {
      // Handle normal crawling logic
      console.log('📝 Processing normal crawl logic...');
      
      if (totalJobs === 0) {
        // No jobs yet, keep current status or set to pending
        status = status === 'pending' ? 'pending' : status;
        console.log(`📝 No jobs found, status: ${status}`);
      } else if (completedJobs === totalJobs && totalJobs > 0) {
        // All jobs completed successfully
        status = 'ready_for_training';
        console.log('✅ All jobs completed successfully, setting to ready_for_training');
      } else if (completedJobs + failedJobs === totalJobs && totalJobs > 0) {
        // All jobs are done (some may have failed)
        if (completedJobs > 0) {
          status = 'ready_for_training';
          console.log('✅ All jobs processed (some completed), setting to ready_for_training');
        } else {
          status = 'failed';
          console.log('❌ All jobs failed, setting to failed');
        }
      } else if (inProgressJobs > 0 || completedJobs > 0) {
        // Some jobs are in progress or completed, but not all done yet
        status = 'in_progress';
        console.log(`🔄 Jobs in progress (completed: ${completedJobs}, inProgress: ${inProgressJobs}), setting to in_progress`);
      } else if (pendingJobs > 0) {
        // Jobs are pending but none started yet
        status = 'pending';
        console.log('⏳ Jobs pending, setting to pending');
      }
    }

    console.log(`📊 Status decision - Old: ${parentSource.crawl_status}, New: ${status}, Event: ${eventType}`);
    return status;
  }

  static calculateProgress(totalJobs: number, completedJobs: number, failedJobs: number): number {
    return totalJobs > 0 ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100) : 0;
  }
}
