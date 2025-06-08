
export interface ConnectionPoolConfig {
  poolName: string;
  minConnections: number;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
}

export interface ConnectionStats {
  poolName: string;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  connectionsCreated: number;
  connectionsDestroyed: number;
  averageWaitTime: number;
}

export class RealConnectionPoolManager {
  private static pools: Map<string, ConnectionPool> = new Map();
  private static readonly DEFAULT_CONFIG: Omit<ConnectionPoolConfig, 'poolName'> = {
    minConnections: 5,
    maxConnections: 100,
    connectionTimeoutMs: 30000,
    idleTimeoutMs: 600000, // 10 minutes
    maxLifetimeMs: 3600000 // 1 hour
  };

  /**
   * Initialize a connection pool
   */
  static async initializePool(config: ConnectionPoolConfig): Promise<boolean> {
    try {
      console.log(`🏊 Initializing connection pool: ${config.poolName}`);

      const pool = new ConnectionPool({
        ...this.DEFAULT_CONFIG,
        ...config
      });

      await pool.initialize();
      this.pools.set(config.poolName, pool);

      console.log(`✅ Connection pool initialized: ${config.poolName}`);
      return true;
    } catch (error) {
      console.error(`Failed to initialize pool ${config.poolName}:`, error);
      return false;
    }
  }

  /**
   * Get a connection from the specified pool
   */
  static async getConnection(poolName: string): Promise<PooledConnection | null> {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        console.warn(`Pool not found: ${poolName}`);
        return null;
      }

      return await pool.acquire();
    } catch (error) {
      console.error(`Failed to get connection from pool ${poolName}:`, error);
      return null;
    }
  }

  /**
   * Release a connection back to the pool
   */
  static async releaseConnection(
    poolName: string, 
    connection: PooledConnection
  ): Promise<boolean> {
    try {
      const pool = this.pools.get(poolName);
      if (!pool) {
        console.warn(`Pool not found: ${poolName}`);
        return false;
      }

      await pool.release(connection);
      return true;
    } catch (error) {
      console.error(`Failed to release connection to pool ${poolName}:`, error);
      return false;
    }
  }

  /**
   * Get statistics for all pools
   */
  static getPoolStats(): ConnectionStats[] {
    return Array.from(this.pools.entries()).map(([name, pool]) => ({
      poolName: name,
      ...pool.getStats()
    }));
  }

  /**
   * Get statistics for a specific pool
   */
  static getPoolStatsByName(poolName: string): ConnectionStats | null {
    const pool = this.pools.get(poolName);
    if (!pool) return null;

    return {
      poolName,
      ...pool.getStats()
    };
  }

  /**
   * Health check for all pools
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    pools: Array<{
      name: string;
      healthy: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let overallHealthy = true;

    for (const [name, pool] of this.pools.entries()) {
      try {
        const healthy = await pool.healthCheck();
        results.push({ name, healthy });
        if (!healthy) overallHealthy = false;
      } catch (error) {
        results.push({ 
          name, 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      pools: results
    };
  }

  /**
   * Shutdown all pools
   */
  static async shutdown(): Promise<void> {
    console.log('🔄 Shutting down all connection pools...');

    const shutdownPromises = Array.from(this.pools.entries()).map(async ([name, pool]) => {
      try {
        await pool.shutdown();
        console.log(`✅ Pool ${name} shut down successfully`);
      } catch (error) {
        console.error(`❌ Failed to shutdown pool ${name}:`, error);
      }
    });

    await Promise.allSettled(shutdownPromises);
    this.pools.clear();

    console.log('🏁 All connection pools shut down');
  }
}

class ConnectionPool {
  private config: ConnectionPoolConfig;
  private connections: PooledConnection[] = [];
  private availableConnections: PooledConnection[] = [];
  private waitingQueue: Array<{
    resolve: (connection: PooledConnection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private stats = {
    connectionsCreated: 0,
    connectionsDestroyed: 0,
    totalWaitTime: 0,
    waitingRequests: 0
  };

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const connection = await this.createConnection();
      this.connections.push(connection);
      this.availableConnections.push(connection);
    }

    // Start maintenance interval
    setInterval(() => this.maintenance(), 30000); // Every 30 seconds
  }

  async acquire(): Promise<PooledConnection> {
    // Check for available connection
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;
      connection.lastUsed = new Date();
      return connection;
    }

    // Create new connection if under max limit
    if (this.connections.length < this.config.maxConnections) {
      const connection = await this.createConnection();
      this.connections.push(connection);
      connection.lastUsed = new Date();
      return connection;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      this.waitingQueue.push({
        resolve: (connection) => {
          this.stats.totalWaitTime += Date.now() - startTime;
          this.stats.waitingRequests++;
          resolve(connection);
        },
        reject,
        timestamp: startTime
      });

      // Set timeout
      setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.timestamp === startTime);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          reject(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeoutMs);
    });
  }

  async release(connection: PooledConnection): Promise<void> {
    connection.lastUsed = new Date();

    // If there are waiting requests, fulfill them
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      waiter.resolve(connection);
      return;
    }

    // Return to available pool
    this.availableConnections.push(connection);
  }

  private async createConnection(): Promise<PooledConnection> {
    const connection: PooledConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastUsed: new Date(),
      isActive: true
    };

    this.stats.connectionsCreated++;
    return connection;
  }

  private async destroyConnection(connection: PooledConnection): Promise<void> {
    connection.isActive = false;
    this.stats.connectionsDestroyed++;

    // Remove from all arrays
    const connIndex = this.connections.indexOf(connection);
    if (connIndex !== -1) {
      this.connections.splice(connIndex, 1);
    }

    const availIndex = this.availableConnections.indexOf(connection);
    if (availIndex !== -1) {
      this.availableConnections.splice(availIndex, 1);
    }
  }

  private async maintenance(): Promise<void> {
    const now = new Date();

    // Remove idle connections
    const idleConnections = this.availableConnections.filter(conn => 
      now.getTime() - conn.lastUsed.getTime() > this.config.idleTimeoutMs
    );

    for (const conn of idleConnections) {
      if (this.connections.length > this.config.minConnections) {
        await this.destroyConnection(conn);
      }
    }

    // Remove expired connections
    const expiredConnections = this.connections.filter(conn =>
      now.getTime() - conn.createdAt.getTime() > this.config.maxLifetimeMs
    );

    for (const conn of expiredConnections) {
      await this.destroyConnection(conn);
      
      // Create replacement if needed
      if (this.connections.length < this.config.minConnections) {
        const newConnection = await this.createConnection();
        this.connections.push(newConnection);
        this.availableConnections.push(newConnection);
      }
    }
  }

  getStats(): Omit<ConnectionStats, 'poolName'> {
    return {
      activeConnections: this.connections.length - this.availableConnections.length,
      idleConnections: this.availableConnections.length,
      totalConnections: this.connections.length,
      maxConnections: this.config.maxConnections,
      connectionsCreated: this.stats.connectionsCreated,
      connectionsDestroyed: this.stats.connectionsDestroyed,
      averageWaitTime: this.stats.waitingRequests > 0 
        ? this.stats.totalWaitTime / this.stats.waitingRequests 
        : 0
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test acquiring and releasing a connection
      const connection = await this.acquire();
      await this.release(connection);
      return true;
    } catch (error) {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    // Clear waiting queue
    this.waitingQueue.forEach(waiter => {
      waiter.reject(new Error('Pool is shutting down'));
    });
    this.waitingQueue = [];

    // Destroy all connections
    for (const connection of this.connections) {
      await this.destroyConnection(connection);
    }
  }
}

interface PooledConnection {
  id: string;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}
