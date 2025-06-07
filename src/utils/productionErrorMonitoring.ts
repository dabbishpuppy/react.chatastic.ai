
/**
 * Production error monitoring for 406 and other critical errors
 */
export class ProductionErrorMonitor {
  private static errorCounts = new Map<string, number>();
  private static readonly MAX_ERRORS_PER_MINUTE = 10;
  private static lastReset = Date.now();

  /**
   * Track and log 406 errors specifically
   */
  static track406Error(context: string, details?: any): void {
    const key = `406_${context}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    console.warn(`🚨 406 Error in ${context}:`, {
      count: count + 1,
      details,
      timestamp: new Date().toISOString()
    });

    // Reset counters every minute
    this.resetIfNeeded();

    // Circuit breaker: if too many 406s, log critical alert
    if (count + 1 > this.MAX_ERRORS_PER_MINUTE) {
      console.error(`🔥 CRITICAL: Too many 406 errors in ${context}. May need circuit breaker.`);
      
      // In production, you'd send this to Sentry/Datadog/etc:
      // Sentry.captureException(new Error(`High 406 error rate in ${context}`));
    }
  }

  /**
   * Track general production errors
   */
  static trackError(error: any, context: string): void {
    const errorInfo = {
      message: error?.message || 'Unknown error',
      status: error?.status,
      code: error?.code,
      context,
      timestamp: new Date().toISOString()
    };

    console.error(`❌ Production Error in ${context}:`, errorInfo);

    // Track specific error types
    if (error?.status === 406) {
      this.track406Error(context, errorInfo);
    }

    // In production, send to monitoring service:
    // Sentry.captureException(error, { extra: errorInfo });
  }

  /**
   * Get current error statistics
   */
  static getErrorStats(): Record<string, number> {
    this.resetIfNeeded();
    return Object.fromEntries(this.errorCounts);
  }

  private static resetIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastReset > 60000) { // 1 minute
      this.errorCounts.clear();
      this.lastReset = now;
    }
  }

  /**
   * Check if system should pause due to too many errors
   */
  static shouldPause(context: string): boolean {
    const key = `406_${context}`;
    const count = this.errorCounts.get(key) || 0;
    return count > this.MAX_ERRORS_PER_MINUTE;
  }
}

/**
 * Enhanced error handler with circuit breaker logic
 */
export function handleProductionError(error: any, context: string): void {
  ProductionErrorMonitor.trackError(error, context);

  // Don't throw on 406 - just log and continue
  if (error?.status === 406) {
    return;
  }

  // Throw other errors
  throw error;
}
