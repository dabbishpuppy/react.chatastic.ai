
import { SourcePage, CompressionStats } from './types.ts';

export class StatisticsCalculator {
  static calculateJobStatistics(pages: SourcePage[]) {
    const totalJobs = pages?.length || 0;
    const completedJobs = pages?.filter(page => page.status === 'completed').length || 0;
    const failedJobs = pages?.filter(page => page.status === 'failed').length || 0;
    const pendingJobs = pages?.filter(page => page.status === 'pending').length || 0;
    const inProgressJobs = pages?.filter(page => page.status === 'in_progress').length || 0;

    console.log(`📊 Job statistics - Total: ${totalJobs}, Completed: ${completedJobs}, Failed: ${failedJobs}, Pending: ${pendingJobs}, InProgress: ${inProgressJobs}`);

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      inProgressJobs
    };
  }

  static calculateCompressionStats(pages: SourcePage[]): { stats: CompressionStats; totalChildSize: number; completedJobsData: SourcePage[] } {
    const completedJobsData = pages?.filter(job => job.status === 'completed') || [];
    const totalChildSize = completedJobsData.reduce((sum, job) => sum + (job.content_size || 0), 0);
    
    const stats: CompressionStats = {
      totalContentSize: totalChildSize,
      avgCompressionRatio: completedJobsData.length > 0 
        ? completedJobsData.reduce((sum, job) => sum + (job.compression_ratio || 0), 0) / completedJobsData.length 
        : 0,
      totalUniqueChunks: completedJobsData.reduce((sum, job) => sum + (job.chunks_created || 0), 0),
      totalDuplicateChunks: completedJobsData.reduce((sum, job) => sum + (job.duplicates_found || 0), 0)
    };

    console.log(`📏 Size calculation - Total child size: ${totalChildSize} bytes from ${completedJobsData.length} completed pages`);

    return { stats, totalChildSize, completedJobsData };
  }
}
