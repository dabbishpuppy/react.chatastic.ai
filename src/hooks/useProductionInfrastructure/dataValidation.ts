
import type { ValidatedInfrastructureHealth, ValidatedSystemHealth, ValidatedAutoscalingStatus } from './types';

export const validateInfrastructureHealth = (health: any): ValidatedInfrastructureHealth => {
  if (health && typeof health === 'object') {
    const healthScore = health.overall?.healthScore || 0;
    return {
      healthPercentage: isNaN(healthScore) ? 0 : Math.max(0, Math.min(100, healthScore)),
      healthy: healthScore >= 70,
      queueDepth: health.connectionPools?.queuedRequests || 0,
      activeWorkers: health.connectionPools?.activeConnections || 0,
      errorRate: isNaN(health.rateLimiting?.throttledRequests || 0) ? 0 : (health.rateLimiting?.throttledRequests || 0) / 100
    };
  }

  return {
    healthPercentage: 0,
    healthy: false,
    queueDepth: 0,
    activeWorkers: 0,
    errorRate: 0,
    status: 'unavailable'
  };
};

export const validateSystemHealth = (health: any): ValidatedSystemHealth => {
  if (health && typeof health === 'object') {
    const metrics = (health as any).metrics;
    return {
      cpuUsage: typeof metrics?.cpuUsage === 'number' && !isNaN(metrics.cpuUsage) ? Math.max(0, Math.min(100, metrics.cpuUsage)) : 0,
      memoryUsage: typeof metrics?.memoryUsage === 'number' && !isNaN(metrics.memoryUsage) ? Math.max(0, Math.min(100, metrics.memoryUsage)) : 0,
      responseTime: typeof metrics?.responseTime === 'number' && !isNaN(metrics.responseTime) ? Math.max(0, metrics.responseTime) : 0
    };
  }

  return {
    cpuUsage: 0,
    memoryUsage: 0,
    responseTime: 0,
    status: 'unavailable'
  };
};

export const validateAutoscalingStatus = (status: any): ValidatedAutoscalingStatus => {
  if (status && typeof status === 'object') {
    const metrics = (status as any).metrics;
    return {
      currentWorkers: typeof (status as any).currentWorkers === 'number' && !isNaN((status as any).currentWorkers) ? Math.max(0, (status as any).currentWorkers) : 0,
      targetWorkers: typeof metrics?.targetWorkers === 'number' && !isNaN(metrics.targetWorkers) ? Math.max(0, metrics.targetWorkers) : 0,
      scalingActivity: Boolean((status as any).active)
    };
  }

  return {
    currentWorkers: 0,
    targetWorkers: 0,
    scalingActivity: false,
    status: 'unavailable'
  };
};
