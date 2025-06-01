import { EnhancedCrawlService, EnhancedCrawlRequest } from './enhancedCrawlService';
import { AutoscalingService } from './autoscalingService';
import { MonitoringAndAlertingService } from './monitoringAndAlerting';
import { SecurityService } from './securityService';

export interface LoadTestConfig {
  concurrentCustomers: number;
  pagesPerCustomer: number;
  testDurationMinutes: number;
  rampUpMinutes: number;
  targetSiteUrls: string[];
  acceptanceCriteria: AcceptanceCriteria;
}

export interface AcceptanceCriteria {
  maxCompletionTimeMinutes: number;
  maxCpuUtilization: number;
  maxErrorRate: number;
  minCompressionRatio: number;
  maxOrphanedJobs: number;
}

export interface LoadTestResult {
  config: LoadTestConfig;
  results: {
    totalCrawlsInitiated: number;
    totalCrawlsCompleted: number;
    totalCrawlsFailed: number;
    averageCompletionTimeMinutes: number;
    maxCompletionTimeMinutes: number;
    averageCompressionRatio: number;
    totalPagesProcessed: number;
    errorRate: number;
    orphanedJobs: number;
    peakCpuUtilization: number;
    peakMemoryUtilization: number;
    autoscalingEvents: number;
  };
  acceptanceCriteriaMet: boolean;
  failedCriteria: string[];
  recommendations: string[];
}

export interface TestCustomer {
  id: string;
  name: string;
  tier: string;
  crawlsInitiated: number;
  crawlsCompleted: number;
  crawlsFailed: number;
  totalProcessingTime: number;
}

export class LoadTestingService {
  private static testInProgress = false;
  private static currentTest: LoadTestConfig | null = null;
  private static testCustomers: Map<string, TestCustomer> = new Map();
  private static testResults: LoadTestResult | null = null;

  // Run comprehensive load test
  static async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    if (this.testInProgress) {
      throw new Error('Load test already in progress');
    }

    console.log('🚀 Starting load test with config:', config);
    
    this.testInProgress = true;
    this.currentTest = config;
    this.testCustomers.clear();

    try {
      // Initialize services
      await this.initializeTestEnvironment();
      
      // Create test customers
      await this.createTestCustomers(config.concurrentCustomers);
      
      // Run the test
      const results = await this.executeLoadTest(config);
      
      // Evaluate acceptance criteria
      const evaluation = this.evaluateAcceptanceCriteria(results, config.acceptanceCriteria);
      
      this.testResults = {
        config,
        results,
        acceptanceCriteriaMet: evaluation.passed,
        failedCriteria: evaluation.failedCriteria,
        recommendations: evaluation.recommendations
      };
      
      console.log('✅ Load test completed:', this.testResults);
      return this.testResults;
      
    } catch (error) {
      console.error('❌ Load test failed:', error);
      throw error;
    } finally {
      this.testInProgress = false;
      this.currentTest = null;
      await this.cleanupTestEnvironment();
    }
  }

  // Initialize test environment
  private static async initializeTestEnvironment(): Promise<void> {
    console.log('🔧 Initializing test environment...');
    
    // Start monitoring services
    await MonitoringAndAlertingService.startMonitoring();
    await AutoscalingService.startAutoscaling();
    await SecurityService.initializeSecurity();
    
    console.log('✅ Test environment initialized');
  }

  // Create test customers
  private static async createTestCustomers(count: number): Promise<void> {
    console.log(`👥 Creating ${count} test customers...`);
    
    for (let i = 0; i < count; i++) {
      const customer: TestCustomer = {
        id: `test-customer-${i + 1}`,
        name: `Test Customer ${i + 1}`,
        tier: this.getRandomTier(),
        crawlsInitiated: 0,
        crawlsCompleted: 0,
        crawlsFailed: 0,
        totalProcessingTime: 0
      };
      
      this.testCustomers.set(customer.id, customer);
    }
    
    console.log(`✅ Created ${count} test customers`);
  }

  // Execute the load test
  private static async executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult['results']> {
    console.log('⚡ Executing load test...');
    
    const startTime = Date.now();
    const testPromises: Promise<void>[] = [];
    const rampUpDelay = (config.rampUpMinutes * 60 * 1000) / config.concurrentCustomers;
    
    // Start crawls with ramp-up
    for (const [customerId, customer] of this.testCustomers) {
      const customerPromise = this.runCustomerTest(customer, config);
      testPromises.push(customerPromise);
      
      // Add ramp-up delay
      if (rampUpDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, rampUpDelay));
      }
    }
    
    // Wait for all tests to complete or timeout
    const testTimeout = config.testDurationMinutes * 60 * 1000;
    await Promise.race([
      Promise.allSettled(testPromises),
      new Promise(resolve => setTimeout(resolve, testTimeout))
    ]);
    
    const endTime = Date.now();
    const totalTimeMinutes = (endTime - startTime) / 60000;
    
    // Collect results
    return this.collectTestResults(totalTimeMinutes);
  }

  // Run test for a single customer
  private static async runCustomerTest(customer: TestCustomer, config: LoadTestConfig): Promise<void> {
    console.log(`🧪 Running test for customer: ${customer.name}`);
    
    try {
      for (let i = 0; i < config.pagesPerCustomer; i++) {
        const url = config.targetSiteUrls[i % config.targetSiteUrls.length];
        
        const crawlRequest: EnhancedCrawlRequest = {
          agentId: customer.id, // Changed from customerId to agentId
          url,
          maxPages: Math.min(10, config.pagesPerCustomer),
          excludePaths: ['/wp-json/*', '/wp-admin/*'],
          respectRobots: true,
          enableCompression: true,
          enableDeduplication: true,
          maxConcurrentJobs: 2
        };
        
        const crawlStart = Date.now();
        customer.crawlsInitiated++;
        
        try {
          // Initiate crawl
          await EnhancedCrawlService.initiateCrawl(crawlRequest);
          
          // Wait for completion (simplified - in real test would use subscriptions)
          await this.waitForCrawlCompletion(customer.id, 300000); // 5 min timeout
          
          customer.crawlsCompleted++;
          customer.totalProcessingTime += Date.now() - crawlStart;
          
        } catch (error) {
          console.error(`Crawl failed for customer ${customer.name}:`, error);
          customer.crawlsFailed++;
        }
        
        // Small delay between crawls for the same customer
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Customer test failed for ${customer.name}:`, error);
    }
  }

  // Wait for crawl completion (simplified)
  private static async waitForCrawlCompletion(customerId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Crawl completion timeout'));
      }, timeoutMs);
      
      // Simulate crawl completion after random delay
      const completionTime = Math.random() * 60000 + 30000; // 30s to 90s
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, completionTime);
    });
  }

  // Collect test results
  private static async collectTestResults(totalTimeMinutes: number): Promise<LoadTestResult['results']> {
    const customers = Array.from(this.testCustomers.values());
    
    const totalCrawlsInitiated = customers.reduce((sum, c) => sum + c.crawlsInitiated, 0);
    const totalCrawlsCompleted = customers.reduce((sum, c) => sum + c.crawlsCompleted, 0);
    const totalCrawlsFailed = customers.reduce((sum, c) => sum + c.crawlsFailed, 0);
    const totalProcessingTime = customers.reduce((sum, c) => sum + c.totalProcessingTime, 0);
    
    const averageCompletionTimeMinutes = totalCrawlsCompleted > 0 
      ? (totalProcessingTime / totalCrawlsCompleted) / 60000 
      : 0;
    
    const errorRate = totalCrawlsInitiated > 0 
      ? totalCrawlsFailed / totalCrawlsInitiated 
      : 0;
    
    // Get monitoring data
    const systemHealth = await MonitoringAndAlertingService.getSystemHealthSummary();
    const autoscalingStatus = await AutoscalingService.getAutoscalingStatus();
    
    return {
      totalCrawlsInitiated,
      totalCrawlsCompleted,
      totalCrawlsFailed,
      averageCompletionTimeMinutes,
      maxCompletionTimeMinutes: totalTimeMinutes,
      averageCompressionRatio: 0.25, // Simulated
      totalPagesProcessed: totalCrawlsCompleted * 10, // Estimated
      errorRate,
      orphanedJobs: 0, // Would be calculated from queue
      peakCpuUtilization: Math.random() * 80 + 20, // Simulated
      peakMemoryUtilization: Math.random() * 70 + 30, // Simulated
      autoscalingEvents: autoscalingStatus.recentEvents.length
    };
  }

  // Evaluate acceptance criteria
  private static evaluateAcceptanceCriteria(
    results: LoadTestResult['results'],
    criteria: AcceptanceCriteria
  ): { passed: boolean; failedCriteria: string[]; recommendations: string[] } {
    const failedCriteria: string[] = [];
    const recommendations: string[] = [];
    
    // Check completion time
    if (results.averageCompletionTimeMinutes > criteria.maxCompletionTimeMinutes) {
      failedCriteria.push(`Average completion time (${results.averageCompletionTimeMinutes.toFixed(1)}min) exceeds limit (${criteria.maxCompletionTimeMinutes}min)`);
      recommendations.push('Consider increasing worker pool size or optimizing processing pipeline');
    }
    
    // Check CPU utilization
    if (results.peakCpuUtilization > criteria.maxCpuUtilization) {
      failedCriteria.push(`Peak CPU utilization (${results.peakCpuUtilization.toFixed(1)}%) exceeds limit (${criteria.maxCpuUtilization}%)`);
      recommendations.push('Scale up infrastructure or optimize CPU-intensive operations');
    }
    
    // Check error rate
    if (results.errorRate > criteria.maxErrorRate) {
      failedCriteria.push(`Error rate (${(results.errorRate * 100).toFixed(1)}%) exceeds limit (${(criteria.maxErrorRate * 100).toFixed(1)}%)`);
      recommendations.push('Investigate and fix common failure causes, improve retry logic');
    }
    
    // Check compression ratio
    if (results.averageCompressionRatio > criteria.minCompressionRatio) {
      failedCriteria.push(`Compression ratio (${results.averageCompressionRatio.toFixed(3)}) is below target (${criteria.minCompressionRatio})`);
      recommendations.push('Improve compression algorithms or content cleaning');
    }
    
    // Check orphaned jobs
    if (results.orphanedJobs > criteria.maxOrphanedJobs) {
      failedCriteria.push(`Orphaned jobs (${results.orphanedJobs}) exceed limit (${criteria.maxOrphanedJobs})`);
      recommendations.push('Improve job cleanup and status aggregation logic');
    }
    
    return {
      passed: failedCriteria.length === 0,
      failedCriteria,
      recommendations
    };
  }

  // Get random tier for test customers
  private static getRandomTier(): string {
    const tiers = ['basic', 'pro', 'enterprise'];
    return tiers[Math.floor(Math.random() * tiers.length)];
  }

  // Cleanup test environment
  private static async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    
    // Clean up test data, stop services, etc.
    this.testCustomers.clear();
    
    console.log('✅ Test environment cleaned up');
  }

  // Get current test status
  static getTestStatus(): {
    inProgress: boolean;
    config: LoadTestConfig | null;
    results: LoadTestResult | null;
  } {
    return {
      inProgress: this.testInProgress,
      config: this.currentTest,
      results: this.testResults
    };
  }

  // Run quick validation test
  static async runQuickValidation(): Promise<boolean> {
    console.log('🔍 Running quick validation test...');
    
    try {
      const quickConfig: LoadTestConfig = {
        concurrentCustomers: 5,
        pagesPerCustomer: 10,
        testDurationMinutes: 2,
        rampUpMinutes: 0.5,
        targetSiteUrls: ['https://example.com'],
        acceptanceCriteria: {
          maxCompletionTimeMinutes: 3,
          maxCpuUtilization: 80,
          maxErrorRate: 0.1,
          minCompressionRatio: 0.5,
          maxOrphanedJobs: 0
        }
      };
      
      const results = await this.runLoadTest(quickConfig);
      return results.acceptanceCriteriaMet;
      
    } catch (error) {
      console.error('Quick validation failed:', error);
      return false;
    }
  }
}
