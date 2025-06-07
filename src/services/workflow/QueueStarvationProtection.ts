
import { supabase } from '@/integrations/supabase/client';

interface QueueStats {
  priority: number;
  count: number;
  oldestJob: Date;
  averageWaitTime: number;
}

export class QueueStarvationProtection {
  private static readonly HIGH_PRIORITY = 1;
  private static readonly NORMAL_PRIORITY = 100;
  private static readonly LOW_PRIORITY = 1000;
  private static readonly STARVATION_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly BOOST_FACTOR = 0.5; // Multiply priority by this to boost

  /**
   * Get the next batch of jobs using weighted round-robin scheduling
   */
  static async getNextJobBatch(batchSize: number = 10): Promise<any[]> {
    try {
      // Get queue statistics first
      const queueStats = await this.getQueueStatistics();
      
      // Check for starved queues and boost their priority if needed
      await this.boostStarvedQueues(queueStats);
      
      // Get jobs with dynamic priority consideration
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (error) {
        console.error('Error fetching job batch:', error);
        return [];
      }

      console.log(`📋 Retrieved ${jobs?.length || 0} jobs with starvation protection`);
      return jobs || [];
    } catch (error) {
      console.error('Error in starvation protection:', error);
      return [];
    }
  }

  /**
   * Get statistics for each priority queue
   */
  private static async getQueueStatistics(): Promise<Map<number, QueueStats>> {
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('priority, created_at')
      .eq('status', 'pending');

    if (error || !jobs) {
      return new Map();
    }

    const stats = new Map<number, QueueStats>();
    const now = new Date();

    // Group jobs by priority
    const jobsByPriority = jobs.reduce((acc, job) => {
      const priority = job.priority || this.NORMAL_PRIORITY;
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(new Date(job.created_at));
      return acc;
    }, {} as Record<number, Date[]>);

    // Calculate statistics for each priority level
    for (const [priority, jobDates] of Object.entries(jobsByPriority)) {
      const priorityNum = parseInt(priority);
      const oldestJob = new Date(Math.min(...jobDates.map(d => d.getTime())));
      const averageWaitTime = jobDates.reduce((sum, date) => 
        sum + (now.getTime() - date.getTime()), 0) / jobDates.length;

      stats.set(priorityNum, {
        priority: priorityNum,
        count: jobDates.length,
        oldestJob,
        averageWaitTime
      });
    }

    return stats;
  }

  /**
   * Boost priority of starved queues
   */
  private static async boostStarvedQueues(queueStats: Map<number, QueueStats>): Promise<void> {
    const now = new Date();
    const starvedQueues: number[] = [];

    // Identify starved queues
    for (const [priority, stats] of queueStats.entries()) {
      const waitTime = now.getTime() - stats.oldestJob.getTime();
      
      if (waitTime > this.STARVATION_THRESHOLD_MS && priority > this.HIGH_PRIORITY) {
        starvedQueues.push(priority);
        console.warn(`⚠️ Queue starvation detected for priority ${priority} (${Math.round(waitTime / 60000)}min wait)`);
      }
    }

    // Boost starved queues
    for (const priority of starvedQueues) {
      const newPriority = Math.max(1, Math.floor(priority * this.BOOST_FACTOR));
      
      try {
        const { error } = await supabase
          .from('background_jobs')
          .update({ priority: newPriority })
          .eq('status', 'pending')
          .eq('priority', priority)
          .lt('created_at', new Date(Date.now() - this.STARVATION_THRESHOLD_MS).toISOString());

        if (error) {
          console.error('Error boosting starved queue:', error);
        } else {
          console.log(`🚀 Boosted starved queue from priority ${priority} to ${newPriority}`);
        }
      } catch (error) {
        console.error('Failed to boost starved queue:', error);
      }
    }
  }

  /**
   * Implement fair scheduling algorithm
   */
  static async getFairScheduledJobs(batchSize: number = 10): Promise<any[]> {
    try {
      // Get a balanced mix of jobs from different priority levels
      const highPriorityJobs = await this.getJobsByPriorityRange(1, 50, Math.ceil(batchSize * 0.4));
      const normalPriorityJobs = await this.getJobsByPriorityRange(51, 200, Math.ceil(batchSize * 0.4));
      const lowPriorityJobs = await this.getJobsByPriorityRange(201, 9999, Math.ceil(batchSize * 0.2));

      // Combine and sort by creation time within each priority group
      const allJobs = [...highPriorityJobs, ...normalPriorityJobs, ...lowPriorityJobs];
      
      // Limit to batch size
      return allJobs.slice(0, batchSize);
    } catch (error) {
      console.error('Error in fair scheduling:', error);
      return [];
    }
  }

  /**
   * Get jobs within a specific priority range
   */
  private static async getJobsByPriorityRange(
    minPriority: number, 
    maxPriority: number, 
    limit: number
  ): Promise<any[]> {
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .gte('priority', minPriority)
      .lte('priority', maxPriority)
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching jobs by priority range:', error);
      return [];
    }

    return jobs || [];
  }

  /**
   * Monitor queue health and detect starvation
   */
  static async monitorQueueHealth(): Promise<{
    healthy: boolean;
    starvedQueues: number[];
    recommendations: string[];
  }> {
    const queueStats = await this.getQueueStatistics();
    const starvedQueues: number[] = [];
    const recommendations: string[] = [];
    const now = new Date();

    for (const [priority, stats] of queueStats.entries()) {
      const waitTime = now.getTime() - stats.oldestJob.getTime();
      
      if (waitTime > this.STARVATION_THRESHOLD_MS) {
        starvedQueues.push(priority);
        
        if (priority > this.NORMAL_PRIORITY) {
          recommendations.push(`Consider boosting priority ${priority} queue (${stats.count} jobs waiting ${Math.round(waitTime / 60000)}min)`);
        }
      }
      
      if (stats.count > 100) {
        recommendations.push(`Priority ${priority} queue has ${stats.count} jobs - consider scaling workers`);
      }
    }

    const healthy = starvedQueues.length === 0 && recommendations.length === 0;

    return {
      healthy,
      starvedQueues,
      recommendations
    };
  }
}
