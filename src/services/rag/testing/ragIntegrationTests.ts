
import { RAGOrchestrator, RAGRequest } from '../ragOrchestrator';
import { RAGChatIntegration } from '../ui/ragChatIntegration';

export class RAGIntegrationTests {
  static async testBasicRAGIntegration(): Promise<boolean> {
    try {
      console.log('🧪 Testing basic RAG integration...');
      
      const testRequest: RAGRequest = {
        query: 'What is the purpose of this system?',
        agentId: crypto.randomUUID(),
        conversationId: crypto.randomUUID(),
        options: {
          searchFilters: {
            maxResults: 5,
            minSimilarity: 0.3,
            sourceTypes: []
          },
          rankingOptions: {
            maxChunks: 3,
            maxTokens: 1000,
            diversityWeight: 0.3,
            recencyWeight: 0.2
          },
          llmOptions: {
            temperature: 0.7
          },
          streaming: false,
          postProcessing: {
            addSourceCitations: true,
            formatMarkdown: true,
            enforceContentSafety: true
          }
        }
      };

      const response = await RAGOrchestrator.processRAGRequest(testRequest);
      
      console.log('✅ Basic RAG integration test passed');
      return response.processedResponse.content.length > 0;
    } catch (error) {
      console.error('❌ Basic RAG integration test failed:', error);
      return false;
    }
  }

  static async testChatIntegration(): Promise<boolean> {
    try {
      console.log('🧪 Testing chat integration...');
      
      const result = await RAGChatIntegration.processMessageWithRAG(
        'Hello, how can you help me?',
        crypto.randomUUID(),
        crypto.randomUUID(),
        {
          enableRAG: true,
          maxSources: 3
        }
      );

      console.log('✅ Chat integration test passed');
      return result.response.length > 0;
    } catch (error) {
      console.error('❌ Chat integration test failed:', error);
      return false;
    }
  }

  static async testPerformanceMetrics(): Promise<boolean> {
    try {
      console.log('🧪 Testing performance metrics...');
      
      const testRequest: RAGRequest = {
        query: 'Performance test query',
        agentId: crypto.randomUUID(),
        options: {
          searchFilters: {
            maxResults: 5,
            minSimilarity: 0.3,
            sourceTypes: []
          },
          rankingOptions: {
            maxChunks: 3,
            maxTokens: 1000,
            diversityWeight: 0.3,
            recencyWeight: 0.2
          },
          llmOptions: {
            temperature: 0.7
          },
          streaming: false,
          postProcessing: {
            addSourceCitations: true,
            formatMarkdown: true,
            enforceContentSafety: true
          }
        }
      };

      const response = await RAGOrchestrator.processRAGRequest(testRequest);
      
      const hasPerformanceData = response.performance && 
                                response.performance.totalTime > 0;

      console.log('✅ Performance metrics test passed');
      return hasPerformanceData;
    } catch (error) {
      console.error('❌ Performance metrics test failed:', error);
      return false;
    }
  }

  static async runAllTests(): Promise<{ passed: number; failed: number; total: number }> {
    const tests = [
      this.testBasicRAGIntegration,
      this.testChatIntegration,
      this.testPerformanceMetrics
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.call(this);
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error('Test execution failed:', error);
      }
    }

    return {
      passed,
      failed,
      total: tests.length
    };
  }
}
