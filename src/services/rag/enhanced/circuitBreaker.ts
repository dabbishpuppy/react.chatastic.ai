
interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

export class CircuitBreaker {
  private static instances = new Map<string, CircuitBreakerState>();
  private static readonly FAILURE_THRESHOLD = 5;
  private static readonly TIMEOUT_WINDOW = 60000; // 1 minute
  private static readonly HALF_OPEN_SUCCESS_THRESHOLD = 3;

  static getState(serviceName: string): CircuitBreakerState {
    if (!this.instances.has(serviceName)) {
      this.instances.set(serviceName, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
    }
    return this.instances.get(serviceName)!;
  }

  static async executeWithBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(serviceName);

    // Check if circuit should move from OPEN to HALF_OPEN
    if (state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      if (timeSinceLastFailure > this.TIMEOUT_WINDOW) {
        console.log(`🔄 Circuit breaker for ${serviceName} moving to HALF_OPEN`);
        state.state = 'HALF_OPEN';
        state.successCount = 0;
      } else {
        console.log(`⚡ Circuit breaker for ${serviceName} is OPEN - using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Service ${serviceName} is currently unavailable (circuit breaker OPEN)`);
      }
    }

    try {
      const result = await operation();
      
      // Success - handle state transitions
      if (state.state === 'HALF_OPEN') {
        state.successCount++;
        if (state.successCount >= this.HALF_OPEN_SUCCESS_THRESHOLD) {
          console.log(`✅ Circuit breaker for ${serviceName} moving to CLOSED`);
          state.state = 'CLOSED';
          state.failureCount = 0;
          state.successCount = 0;
        }
      } else if (state.state === 'CLOSED') {
        // Reset failure count on success
        state.failureCount = 0;
      }

      return result;
    } catch (error) {
      // Failure - increment failure count and potentially open circuit
      state.failureCount++;
      state.lastFailureTime = Date.now();

      if (state.state === 'HALF_OPEN' || state.failureCount >= this.FAILURE_THRESHOLD) {
        console.log(`🚨 Circuit breaker for ${serviceName} moving to OPEN`);
        state.state = 'OPEN';
      }

      console.error(`❌ Circuit breaker failure for ${serviceName}:`, error);

      // Try fallback if available
      if (fallback) {
        console.log(`🔄 Using fallback for ${serviceName}`);
        return await fallback();
      }

      throw error;
    }
  }

  static isServiceAvailable(serviceName: string): boolean {
    const state = this.getState(serviceName);
    return state.state !== 'OPEN';
  }

  static getServiceHealth(serviceName: string): {
    state: string;
    failureCount: number;
    successRate: number;
    available: boolean;
  } {
    const state = this.getState(serviceName);
    return {
      state: state.state,
      failureCount: state.failureCount,
      successRate: state.failureCount > 0 ? 
        (1 - (state.failureCount / (state.failureCount + state.successCount))) : 1,
      available: state.state !== 'OPEN'
    };
  }

  static reset(serviceName: string): void {
    this.instances.set(serviceName, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0
    });
    console.log(`🔄 Circuit breaker for ${serviceName} has been reset`);
  }
}
