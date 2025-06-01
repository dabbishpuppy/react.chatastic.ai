
export class CrawlJobManager {
  private static readonly supabaseUrl = 'https://lndfjlkzvxbnoxfuboxz.supabase.co';
  private static readonly apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk';

  static async getCrawlJobs(parentSourceId: string) {
    try {
      const url = `${this.supabaseUrl}/rest/v1/crawl_jobs?parent_source_id=eq.${parentSourceId}&order=created_at.asc`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Error fetching crawl jobs:', response.statusText);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching crawl jobs:', error);
      return [];
    }
  }

  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    try {
      // Get failed jobs that haven't exceeded retry limit
      const fetchUrl = `${this.supabaseUrl}/rest/v1/crawl_jobs?parent_source_id=eq.${parentSourceId}&status=eq.failed&retry_count=lt.3&select=id,retry_count`;
      
      const response = await fetch(fetchUrl, {
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return 0;
      }

      const failedJobs = await response.json();

      if (!Array.isArray(failedJobs) || failedJobs.length === 0) {
        return 0;
      }

      // Update each job individually
      const updatePromises = failedJobs.map(async (job: any) => {
        const updateUrl = `${this.supabaseUrl}/rest/v1/crawl_jobs?id=eq.${job.id}`;
        
        return fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'pending',
            retry_count: (job.retry_count || 0) + 1,
            error_message: null,
            started_at: null,
            completed_at: null
          })
        });
      });

      await Promise.all(updatePromises);
      
      // Trigger re-processing for retried jobs
      await this.triggerJobReprocessing(parentSourceId);
      
      return failedJobs.length;
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      return 0;
    }
  }

  private static async triggerJobReprocessing(parentSourceId: string): Promise<void> {
    try {
      // Call the enhanced crawl function to reprocess pending jobs
      const response = await fetch(`${this.supabaseUrl}/functions/v1/enhanced-crawl-website`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'retry',
          parentSourceId: parentSourceId
        })
      });

      if (!response.ok) {
        console.warn('Failed to trigger job reprocessing:', response.statusText);
      }
    } catch (error) {
      console.error('Error triggering job reprocessing:', error);
    }
  }

  static async getJobMetrics(parentSourceId: string) {
    try {
      const jobs = await this.getCrawlJobs(parentSourceId);
      
      const metrics = {
        totalJobs: jobs.length,
        pendingJobs: jobs.filter(j => j.status === 'pending').length,
        inProgressJobs: jobs.filter(j => j.status === 'in_progress').length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        avgProcessingTime: 0,
        totalContentSize: 0,
        avgCompressionRatio: 0
      };

      const completedJobs = jobs.filter(j => j.status === 'completed');
      if (completedJobs.length > 0) {
        metrics.avgProcessingTime = completedJobs.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / completedJobs.length;
        metrics.totalContentSize = completedJobs.reduce((sum, j) => sum + (j.content_size || 0), 0);
        metrics.avgCompressionRatio = completedJobs.reduce((sum, j) => sum + (j.compression_ratio || 0), 0) / completedJobs.length;
      }

      return metrics;
    } catch (error) {
      console.error('Error getting job metrics:', error);
      return null;
    }
  }
}
