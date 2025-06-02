interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  requestHistory: Array<{
    timestamp: number;
    responseTime: number;
    success: boolean;
    agentId: string;
  }>;
}

export class PerformanceTracker {
  private static metrics: PerformanceMetrics = {
    averageResponseTime: 0,
    successRate: 1.0,
    totalRequests: 0,
    failedRequests: 0,
    requestHistory: []
  };

  static recordRequest(
    agentId: string,
    responseTime: number,
    success: boolean
  ): void {
    const timestamp = Date.now();
    
    // Update counters
    this.metrics.totalRequests++;
    if (!success) {
      this.metrics.failedRequests++;
    }

    // Add to history (keep last 100 requests)
    this.metrics.requestHistory.push({
      timestamp,
      responseTime,
      success,
      agentId
    });

    if (this.metrics.requestHistory.length > 100) {
      this.metrics.requestHistory.shift();
    }

    // Recalculate metrics
    this.recalculateMetrics();
  }

  private static recalculateMetrics(): void {
    const successfulRequests = this.metrics.requestHistory.filter(r => r.success);
    
    // Calculate average response time for successful requests
    if (successfulRequests.length > 0) {
      this.metrics.averageResponseTime = 
        successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
    }

    // Calculate success rate
    this.metrics.successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests
      : 1.0;
  }

  static getMetrics(): PerformanceMetrics & { activeStreams: number } {
    return {
      ...this.metrics,
      activeStreams: 0 // Would be provided by StreamingManager
    };
  }

  static getAgentMetrics(agentId: string): {
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
  } {
    const agentRequests = this.metrics.requestHistory.filter(r => r.agentId === agentId);
    const successfulRequests = agentRequests.filter(r => r.success);

    return {
      totalRequests: agentRequests.length,
      averageResponseTime: successfulRequests.length > 0
        ? successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
        : 0,
      successRate: agentRequests.length > 0
        ? successfulRequests.length / agentRequests.length
        : 1.0
    };
  }

  static clearMetrics(): void {
    this.metrics = {
      averageResponseTime: 0,
      successRate: 1.0,
      totalRequests: 0,
      failedRequests: 0,
      requestHistory: []
    };
  }
}
