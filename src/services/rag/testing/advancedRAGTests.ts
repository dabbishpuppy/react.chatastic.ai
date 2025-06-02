
import { 
  IntelligentRoutingService,
  QueryExpansionService,
  ConversationContextManager,
  ConversationMemoryManager,
  ConversationContextAnalyzer,
  ConversationQueryEnhancer,
  ExpansionStrategiesManager,
  type QueryAnalysis,
  type ConversationMemory,
  type ContextualQuery
} from '../advanced';

export interface AdvancedRAGTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export class AdvancedRAGTests {
  private testResults: AdvancedRAGTestResult[] = [];

  async runAllTests(): Promise<AdvancedRAGTestResult[]> {
    console.log('🧪 Starting Advanced RAG Tests...');
    
    this.testResults = [];

    // Test conversation context management
    await this.testConversationContextFlow();
    
    // Test query expansion
    await this.testQueryExpansion();
    
    // Test intelligent routing
    await this.testIntelligentRouting();
    
    // Test modular components
    await this.testModularComponents();

    console.log('✅ Advanced RAG Tests Complete');
    return this.testResults;
  }

  private async testConversationContextFlow(): Promise<void> {
    await this.runTest('Conversation Context Flow', async () => {
      const conversationId = 'test-conversation-123';
      const agentId = 'test-agent-456';
      const userMessage = 'What is machine learning?';

      // Test memory creation and retrieval
      await ConversationContextManager.updateConversationContext(
        conversationId,
        userMessage
      );

      const memory = await ConversationContextManager.getConversationContext(
        conversationId,
        agentId
      );

      if (!memory) {
        throw new Error('Failed to retrieve conversation memory');
      }

      // Test query enhancement
      const enhancedQuery = await ConversationContextManager.enhanceQueryWithContext(
        'Tell me more about that',
        conversationId,
        agentId
      );

      return {
        memoryCreated: !!memory,
        queryEnhanced: enhancedQuery.expandedQuery !== 'Tell me more about that',
        confidence: enhancedQuery.confidence
      };
    });
  }

  private async testQueryExpansion(): Promise<void> {
    await this.runTest('Query Expansion Service', async () => {
      const query = 'How does AI work?';
      const agentId = 'test-agent';

      const expansion = await QueryExpansionService.expandQuery(
        query,
        agentId
      );

      if (!expansion || !expansion.originalQuery) {
        throw new Error('Query expansion failed');
      }

      // Test strategies
      const strategies = QueryExpansionService.getExpansionStrategies();

      return {
        expansionGenerated: expansion.expandedQueries.length > 0,
        strategiesAvailable: Object.keys(strategies).length > 0,
        confidence: expansion.confidence
      };
    });
  }

  private async testIntelligentRouting(): Promise<void> {
    await this.runTest('Intelligent Routing Service', async () => {
      const query = 'This is a complex technical question about distributed systems';
      const agentId = 'test-agent';

      const analysis = await IntelligentRoutingService.analyzeAndRoute(
        query,
        agentId
      );

      if (!analysis || !analysis.intent || !analysis.routing) {
        throw new Error('Routing analysis failed');
      }

      const stats = IntelligentRoutingService.getRoutingStatistics();

      return {
        intentAnalyzed: !!analysis.intent.type,
        routingDecisionMade: !!analysis.routing.route,
        statsAvailable: !!stats.totalQueries,
        complexity: analysis.intent.complexity
      };
    });
  }

  private async testModularComponents(): Promise<void> {
    await this.runTest('Modular Components Integration', async () => {
      // Test memory manager directly
      const conversationId = 'modular-test-123';
      const agentId = 'modular-agent';

      const initialMemory = await ConversationMemoryManager.getConversationMemory(
        conversationId,
        agentId
      );

      // Test context analyzer
      if (initialMemory) {
        const contextRefs = ConversationContextAnalyzer.findContextReferences(
          'Tell me more about it',
          initialMemory
        );

        const implicitIntents = ConversationContextAnalyzer.detectImplicitIntents(
          'Can you explain that better?',
          initialMemory
        );

        return {
          memoryManagerWorking: !!initialMemory,
          contextAnalyzerWorking: Array.isArray(contextRefs),
          intentDetectionWorking: Array.isArray(implicitIntents)
        };
      }

      return { memoryManagerWorking: false };
    });
  }

  private async runTest(
    testName: string,
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration,
        result
      });
      
      console.log(`✅ ${testName} - Passed (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`❌ ${testName} - Failed: ${error}`);
    }
  }

  getTestSummary(): {
    totalTests: number;
    passed: number;
    failed: number;
    averageDuration: number;
  } {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const averageDuration = totalTests > 0 
      ? this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;

    return { totalTests, passed, failed, averageDuration };
  }
}

export const advancedRAGTests = new AdvancedRAGTests();
