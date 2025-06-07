
import { ParentSource, SourcePage } from './types.ts';

export class StatusCalculator {
  static determineStatus(
    parentSource: ParentSource,
    totalJobs: number,
    completedJobs: number,
    failedJobs: number,
    pendingJobs: number,
    inProgressJobs: number
  ): string {
    let status = parentSource.crawl_status;
    const isRecrawling = parentSource.metadata?.is_recrawling === true;
    const recrawlStartedAt = parentSource.metadata?.recrawl_started_at;

    console.log(`🔍 Recrawl check - isRecrawling: ${isRecrawling}, recrawlStartedAt: ${recrawlStartedAt}`);

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
      } else if (completedJobs === totalJobs) {
        status = 'ready_for_training';
      } else if (completedJobs + failedJobs === totalJobs) {
        status = 'ready_for_training';
      } else if (inProgressJobs > 0 || completedJobs > 0) {
        status = 'in_progress';
      }
    }

    console.log(`📊 Status decision - Old: ${parentSource.crawl_status}, New: ${status}`);
    return status;
  }

  static calculateProgress(totalJobs: number, completedJobs: number, failedJobs: number): number {
    return totalJobs > 0 ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100) : 0;
  }
}
