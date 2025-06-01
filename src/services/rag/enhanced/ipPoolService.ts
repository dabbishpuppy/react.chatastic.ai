import { supabase } from "@/integrations/supabase/client";

export interface IPPool {
  id: string;
  name: string;
  region: string;
  provider: 'aws' | 'gcp' | 'azure' | 'cloudflare';
  ipAddresses: string[];
  isActive: boolean;
  maxConcurrentRequests: number;
  currentLoad: number;
  healthScore: number;
  lastHealthCheck: string;
  rateLimitPerMinute: number;
  costPerRequest: number;
}

export interface IPPoolMetrics {
  poolId: string;
  timestamp: string;
  requestCount: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  bandwidthUsed: number;
  concurrentConnections: number;
}

export interface EgressRoute {
  id: string;
  name: string;
  sourcePattern: string;
  destinationPattern: string;
  preferredPools: string[];
  fallbackPools: string[];
  loadBalancingStrategy: 'round_robin' | 'least_connections' | 'weighted' | 'geo_proximity';
  isActive: boolean;
  priority: number;
}

export class IPPoolService {
  private static ipPools: IPPool[] = [
    {
      id: 'aws-us-east-1',
      name: 'AWS US East 1',
      region: 'us-east-1',
      provider: 'aws',
      ipAddresses: ['52.45.123.10', '52.45.123.11', '52.45.123.12'],
      isActive: true,
      maxConcurrentRequests: 1000,
      currentLoad: 450,
      healthScore: 95,
      lastHealthCheck: new Date().toISOString(),
      rateLimitPerMinute: 10000,
      costPerRequest: 0.001
    },
    {
      id: 'gcp-us-central-1',
      name: 'GCP US Central 1',
      region: 'us-central1',
      provider: 'gcp',
      ipAddresses: ['35.192.45.20', '35.192.45.21', '35.192.45.22'],
      isActive: true,
      maxConcurrentRequests: 800,
      currentLoad: 320,
      healthScore: 92,
      lastHealthCheck: new Date().toISOString(),
      rateLimitPerMinute: 8000,
      costPerRequest: 0.0012
    },
    {
      id: 'azure-west-us-2',
      name: 'Azure West US 2',
      region: 'westus2',
      provider: 'azure',
      ipAddresses: ['13.77.89.30', '13.77.89.31', '13.77.89.32'],
      isActive: true,
      maxConcurrentRequests: 600,
      currentLoad: 180,
      healthScore: 88,
      lastHealthCheck: new Date().toISOString(),
      rateLimitPerMinute: 6000,
      costPerRequest: 0.0015
    },
    {
      id: 'cloudflare-global',
      name: 'Cloudflare Global',
      region: 'global',
      provider: 'cloudflare',
      ipAddresses: ['104.16.123.40', '104.16.123.41', '104.16.123.42'],
      isActive: true,
      maxConcurrentRequests: 2000,
      currentLoad: 850,
      healthScore: 97,
      lastHealthCheck: new Date().toISOString(),
      rateLimitPerMinute: 15000,
      costPerRequest: 0.0008
    }
  ];

  private static egressRoutes: EgressRoute[] = [
    {
      id: 'crawl-social-media',
      name: 'Social Media Crawling',
      sourcePattern: '*.twitter.com|*.facebook.com|*.linkedin.com',
      destinationPattern: '*',
      preferredPools: ['cloudflare-global', 'aws-us-east-1'],
      fallbackPools: ['gcp-us-central-1'],
      loadBalancingStrategy: 'least_connections',
      isActive: true,
      priority: 1
    },
    {
      id: 'crawl-news-sites',
      name: 'News Site Crawling',
      sourcePattern: '*.cnn.com|*.bbc.com|*.reuters.com',
      destinationPattern: '*',
      preferredPools: ['aws-us-east-1', 'gcp-us-central-1'],
      fallbackPools: ['azure-west-us-2'],
      loadBalancingStrategy: 'round_robin',
      isActive: true,
      priority: 2
    },
    {
      id: 'general-crawling',
      name: 'General Website Crawling',
      sourcePattern: '*',
      destinationPattern: '*',
      preferredPools: ['gcp-us-central-1', 'azure-west-us-2'],
      fallbackPools: ['aws-us-east-1'],
      loadBalancingStrategy: 'weighted',
      isActive: true,
      priority: 3
    }
  ];

  private static poolMetrics: IPPoolMetrics[] = [];
  private static isMonitoring = false;

  // Start IP pool monitoring
  static startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('🌐 IP Pool monitoring already active');
      return;
    }

    console.log('🌐 Starting IP pool monitoring...');
    this.isMonitoring = true;

    // Health check every 30 seconds
    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('Error in IP pool health checks:', error);
      }
    }, 30000);

    // Collect metrics every minute
    setInterval(async () => {
      try {
        await this.collectPoolMetrics();
      } catch (error) {
        console.error('Error collecting IP pool metrics:', error);
      }
    }, 60000);

    // Rebalance loads every 2 minutes
    setInterval(async () => {
      try {
        await this.rebalanceLoads();
      } catch (error) {
        console.error('Error rebalancing IP pool loads:', error);
      }
    }, 120000);

    console.log('✅ IP pool monitoring started');
  }

  // Stop monitoring
  static stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('🌐 IP pool monitoring stopped');
  }

  // Get optimal IP pool for a request
  static async selectOptimalPool(
    destinationUrl: string,
    requestType: 'crawl' | 'api' | 'bulk' = 'crawl'
  ): Promise<IPPool | null> {
    // Find matching egress route
    const route = this.findMatchingRoute(destinationUrl);
    if (!route) {
      console.log(`No matching route found for ${destinationUrl}, using general pool`);
      return this.selectPoolByStrategy('least_connections', this.ipPools.filter(p => p.isActive));
    }

    // Get available pools for this route
    const preferredPools = this.ipPools.filter(pool => 
      route.preferredPools.includes(pool.id) && pool.isActive
    );

    const availablePools = preferredPools.length > 0 ? preferredPools : 
      this.ipPools.filter(pool => route.fallbackPools.includes(pool.id) && pool.isActive);

    if (availablePools.length === 0) {
      console.error('No available pools for route:', route.name);
      return null;
    }

    // Select pool based on strategy
    return this.selectPoolByStrategy(route.loadBalancingStrategy, availablePools);
  }

  // Find matching egress route
  private static findMatchingRoute(url: string): EgressRoute | null {
    const hostname = new URL(url).hostname;
    
    return this.egressRoutes
      .filter(route => route.isActive)
      .sort((a, b) => a.priority - b.priority)
      .find(route => this.matchesPattern(hostname, route.sourcePattern));
  }

  // Check if hostname matches pattern
  private static matchesPattern(hostname: string, pattern: string): boolean {
    const patterns = pattern.split('|');
    return patterns.some(p => {
      if (p === '*') return true;
      if (p.startsWith('*.')) {
        const domain = p.slice(2);
        return hostname.endsWith(domain);
      }
      return hostname === p;
    });
  }

  // Select pool by load balancing strategy
  private static selectPoolByStrategy(strategy: string, pools: IPPool[]): IPPool {
    switch (strategy) {
      case 'least_connections':
        return pools.reduce((best, pool) => 
          pool.currentLoad < best.currentLoad ? pool : best
        );
      
      case 'round_robin':
        // Simple round robin based on timestamp
        const index = Math.floor(Date.now() / 1000) % pools.length;
        return pools[index];
      
      case 'weighted':
        // Weighted selection based on health score and capacity
        const weights = pools.map(pool => {
          const capacity = pool.maxConcurrentRequests - pool.currentLoad;
          return Math.max(0, capacity * (pool.healthScore / 100));
        });
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        if (totalWeight === 0) return pools[0];
        
        const random = Math.random() * totalWeight;
        let accumulated = 0;
        
        for (let i = 0; i < pools.length; i++) {
          accumulated += weights[i];
          if (random <= accumulated) return pools[i];
        }
        
        return pools[0];
      
      case 'geo_proximity':
        // For now, prefer US-based pools
        const usPool = pools.find(pool => pool.region.includes('us'));
        return usPool || pools[0];
      
      default:
        return pools[0];
    }
  }

  // Perform health checks on all pools
  private static async performHealthChecks(): Promise<void> {
    console.log('🔍 Performing IP pool health checks...');
    
    for (const pool of this.ipPools) {
      if (!pool.isActive) continue;

      try {
        // Simulate health check for each IP in the pool
        const healthPromises = pool.ipAddresses.map(ip => this.checkIPHealth(ip));
        const healthResults = await Promise.allSettled(healthPromises);
        
        const healthyIPs = healthResults.filter(r => r.status === 'fulfilled').length;
        const healthScore = Math.round((healthyIPs / pool.ipAddresses.length) * 100);
        
        // Update pool health
        pool.healthScore = healthScore;
        pool.lastHealthCheck = new Date().toISOString();
        
        // Mark pool as inactive if too many IPs are unhealthy
        if (healthScore < 30) {
          pool.isActive = false;
          console.warn(`🔴 Pool ${pool.name} marked as inactive due to poor health (${healthScore}%)`);
        } else if (!pool.isActive && healthScore > 70) {
          pool.isActive = true;
          console.log(`🟢 Pool ${pool.name} reactivated (health: ${healthScore}%)`);
        }

      } catch (error) {
        console.error(`Health check failed for pool ${pool.name}:`, error);
        pool.healthScore = 0;
      }
    }
  }

  // Check individual IP health
  private static async checkIPHealth(ip: string): Promise<boolean> {
    try {
      // Simulate health check - in production this would be actual HTTP requests
      const latency = Math.random() * 500 + 50; // 50-550ms
      const isHealthy = latency < 300 && Math.random() > 0.05; // 95% success rate
      
      console.log(`IP ${ip}: ${isHealthy ? 'healthy' : 'unhealthy'} (${latency.toFixed(0)}ms)`);
      return isHealthy;
    } catch (error) {
      return false;
    }
  }

  // Collect metrics for all pools
  private static async collectPoolMetrics(): Promise<void> {
    for (const pool of this.ipPools) {
      if (!pool.isActive) continue;

      const metrics: IPPoolMetrics = {
        poolId: pool.id,
        timestamp: new Date().toISOString(),
        requestCount: Math.floor(Math.random() * 1000) + 500,
        successRate: 95 + Math.random() * 5,
        avgResponseTime: 200 + Math.random() * 300,
        errorRate: Math.random() * 5,
        bandwidthUsed: Math.random() * 10,
        concurrentConnections: pool.currentLoad
      };

      this.poolMetrics.push(metrics);
    }

    // Keep only last 1440 metrics (24 hours at 1-minute intervals per pool)
    const maxMetrics = this.ipPools.length * 1440;
    if (this.poolMetrics.length > maxMetrics) {
      this.poolMetrics = this.poolMetrics.slice(-maxMetrics);
    }
  }

  // Rebalance loads across pools
  private static async rebalanceLoads(): Promise<void> {
    console.log('⚖️ Rebalancing IP pool loads...');

    const activePools = this.ipPools.filter(pool => pool.isActive);
    const totalLoad = activePools.reduce((sum, pool) => sum + pool.currentLoad, 0);
    const avgLoad = totalLoad / activePools.length;

    let rebalanced = 0;

    for (const pool of activePools) {
      const loadDifference = pool.currentLoad - avgLoad;
      
      if (Math.abs(loadDifference) > avgLoad * 0.3) { // 30% threshold
        // Simulate load redistribution
        const adjustment = loadDifference * 0.1; // Move 10% of excess
        pool.currentLoad = Math.max(0, pool.currentLoad - adjustment);
        rebalanced++;
      }
    }

    if (rebalanced > 0) {
      console.log(`✅ Rebalanced ${rebalanced} pools`);
    }
  }

  // Get pool status and metrics
  static getPoolStatus(): {
    pools: IPPool[];
    totalActiveIPs: number;
    totalCapacity: number;
    currentLoad: number;
    avgHealthScore: number;
    recentMetrics: IPPoolMetrics[];
  } {
    const activePools = this.ipPools.filter(pool => pool.isActive);
    const totalActiveIPs = activePools.reduce((sum, pool) => sum + pool.ipAddresses.length, 0);
    const totalCapacity = activePools.reduce((sum, pool) => sum + pool.maxConcurrentRequests, 0);
    const currentLoad = activePools.reduce((sum, pool) => sum + pool.currentLoad, 0);
    const avgHealthScore = activePools.reduce((sum, pool) => sum + pool.healthScore, 0) / activePools.length;

    return {
      pools: [...this.ipPools],
      totalActiveIPs,
      totalCapacity,
      currentLoad,
      avgHealthScore: Math.round(avgHealthScore),
      recentMetrics: this.poolMetrics.slice(-100) // Last 100 metrics
    };
  }

  // Get egress routes configuration
  static getEgressRoutes(): EgressRoute[] {
    return [...this.egressRoutes];
  }

  // Update pool configuration
  static updatePoolConfig(poolId: string, updates: Partial<IPPool>): boolean {
    const pool = this.ipPools.find(p => p.id === poolId);
    if (!pool) return false;

    Object.assign(pool, updates);
    console.log(`🔧 Updated pool ${poolId} configuration`);
    return true;
  }

  // Add new egress route
  static addEgressRoute(route: Omit<EgressRoute, 'id'>): string {
    const id = `route-${Date.now()}`;
    const newRoute: EgressRoute = { ...route, id };
    
    this.egressRoutes.push(newRoute);
    this.egressRoutes.sort((a, b) => a.priority - b.priority);
    
    console.log(`➕ Added egress route: ${newRoute.name}`);
    return id;
  }

  // Remove egress route
  static removeEgressRoute(routeId: string): boolean {
    const index = this.egressRoutes.findIndex(r => r.id === routeId);
    if (index === -1) return false;

    const removed = this.egressRoutes.splice(index, 1)[0];
    console.log(`➖ Removed egress route: ${removed.name}`);
    return true;
  }

  // Get cost analysis
  static getCostAnalysis(): {
    totalMonthlyCost: number;
    costByProvider: Record<string, number>;
    costByRegion: Record<string, number>;
    optimization: {
      potentialSavings: number;
      recommendations: string[];
    };
  } {
    const activePools = this.ipPools.filter(pool => pool.isActive);
    
    // Calculate monthly costs based on usage
    let totalMonthlyCost = 0;
    const costByProvider: Record<string, number> = {};
    const costByRegion: Record<string, number> = {};

    activePools.forEach(pool => {
      const monthlyRequests = pool.currentLoad * 60 * 24 * 30; // Requests per month
      const poolCost = monthlyRequests * pool.costPerRequest;
      
      totalMonthlyCost += poolCost;
      costByProvider[pool.provider] = (costByProvider[pool.provider] || 0) + poolCost;
      costByRegion[pool.region] = (costByRegion[pool.region] || 0) + poolCost;
    });

    // Generate optimization recommendations
    const recommendations: string[] = [];
    let potentialSavings = 0;

    // Check for underutilized pools
    const underutilized = activePools.filter(pool => 
      pool.currentLoad < pool.maxConcurrentRequests * 0.2
    );

    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} pools are underutilized (<20% capacity)`);
      potentialSavings += underutilized.reduce((sum, pool) => 
        sum + (pool.currentLoad * 60 * 24 * 30 * pool.costPerRequest * 0.5), 0
      );
    }

    // Check for expensive providers
    const expensivePools = activePools.filter(pool => pool.costPerRequest > 0.0012);
    if (expensivePools.length > 0) {
      recommendations.push(`Consider migrating ${expensivePools.length} high-cost pools to cheaper providers`);
      potentialSavings += expensivePools.reduce((sum, pool) => 
        sum + (pool.currentLoad * 60 * 24 * 30 * 0.0003), 0
      );
    }

    return {
      totalMonthlyCost: Math.round(totalMonthlyCost),
      costByProvider,
      costByRegion,
      optimization: {
        potentialSavings: Math.round(potentialSavings),
        recommendations
      }
    };
  }
}
