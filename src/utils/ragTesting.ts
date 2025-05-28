
import { supabase } from "@/integrations/supabase/client";
import { useRAGServices } from "@/hooks/useRAGServices";

export class RAGTesting {
  // Test database connection and basic queries
  static async testDatabaseConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Test basic connection
      const { data: healthCheck, error } = await supabase
        .from('agents')
        .select('count')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `Database connection failed: ${error.message}`,
          details: error
        };
      }

      return {
        success: true,
        message: 'Database connection successful',
        details: healthCheck
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error}`,
        details: error
      };
    }
  }

  // Test RAG table access with RLS
  static async testRAGTableAccess(agentId: string): Promise<{
    success: boolean;
    message: string;
    tableResults: Record<string, any>;
  }> {
    const tableResults: Record<string, any> = {};
    
    try {
      // Test agent_sources table
      const { data: sources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('agent_id', agentId)
        .limit(1);

      tableResults.agent_sources = {
        accessible: !sourcesError,
        error: sourcesError?.message,
        recordCount: sources?.length || 0
      };

      // Test source_chunks table
      const { data: chunks, error: chunksError } = await supabase
        .from('source_chunks')
        .select('*')
        .limit(1);

      tableResults.source_chunks = {
        accessible: !chunksError,
        error: chunksError?.message,
        recordCount: chunks?.length || 0
      };

      // Test source_embeddings table
      const { data: embeddings, error: embeddingsError } = await supabase
        .from('source_embeddings')
        .select('*')
        .limit(1);

      tableResults.source_embeddings = {
        accessible: !embeddingsError,
        error: embeddingsError?.message,
        recordCount: embeddings?.length || 0
      };

      // Test agent_training_jobs table
      const { data: jobs, error: jobsError } = await supabase
        .from('agent_training_jobs')
        .select('*')
        .eq('agent_id', agentId)
        .limit(1);

      tableResults.agent_training_jobs = {
        accessible: !jobsError,
        error: jobsError?.message,
        recordCount: jobs?.length || 0
      };

      // Test audit_logs table
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(1);

      tableResults.audit_logs = {
        accessible: !logsError,
        error: logsError?.message,
        recordCount: logs?.length || 0
      };

      const allTablesAccessible = Object.values(tableResults).every(
        (result: any) => result.accessible
      );

      return {
        success: allTablesAccessible,
        message: allTablesAccessible 
          ? 'All RAG tables accessible' 
          : 'Some RAG tables have access issues',
        tableResults
      };
    } catch (error) {
      return {
        success: false,
        message: `Table access test failed: ${error}`,
        tableResults
      };
    }
  }

  // Test service methods
  static async testRAGServices(agentId: string): Promise<{
    success: boolean;
    message: string;
    serviceResults: Record<string, any>;
  }> {
    const serviceResults: Record<string, any> = {};
    
    try {
      const services = {
        sources: (await import('@/services/rag')).AgentSourceService,
        chunks: (await import('@/services/rag')).SourceChunkService,
        training: (await import('@/services/rag')).TrainingJobService,
        audit: (await import('@/services/rag')).AuditService
      };

      // Test AgentSourceService
      try {
        const sources = await services.sources.getSourcesByAgent(agentId);
        serviceResults.AgentSourceService = {
          working: true,
          result: `Found ${sources.length} sources`
        };
      } catch (error: any) {
        serviceResults.AgentSourceService = {
          working: false,
          error: error.message
        };
      }

      // Test SourceChunkService
      try {
        const chunks = await services.chunks.getChunksByAgent(agentId);
        serviceResults.SourceChunkService = {
          working: true,
          result: `Found ${chunks.length} chunks`
        };
      } catch (error: any) {
        serviceResults.SourceChunkService = {
          working: false,
          error: error.message
        };
      }

      // Test TrainingJobService
      try {
        const jobs = await services.training.getJobsByAgent(agentId);
        serviceResults.TrainingJobService = {
          working: true,
          result: `Found ${jobs.length} training jobs`
        };
      } catch (error: any) {
        serviceResults.TrainingJobService = {
          working: false,
          error: error.message
        };
      }

      // Test AuditService
      try {
        const logs = await services.audit.getAgentLogs(agentId, 5);
        serviceResults.AuditService = {
          working: true,
          result: `Found ${logs.length} audit logs`
        };
      } catch (error: any) {
        serviceResults.AuditService = {
          working: false,
          error: error.message
        };
      }

      const allServicesWorking = Object.values(serviceResults).every(
        (result: any) => result.working
      );

      return {
        success: allServicesWorking,
        message: allServicesWorking 
          ? 'All RAG services working correctly' 
          : 'Some RAG services have issues',
        serviceResults
      };
    } catch (error) {
      return {
        success: false,
        message: `Service test failed: ${error}`,
        serviceResults
      };
    }
  }

  // Test encryption/decryption
  static async testEncryption(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const { EncryptionService } = await import('@/services/rag');
      const testData = 'This is sensitive test data';
      
      const encrypted = await EncryptionService.encryptSensitiveData(testData);
      const decrypted = await EncryptionService.decryptSensitiveData(encrypted);
      
      const encryptionWorking = decrypted === testData;
      const isEncryptedCheck = EncryptionService.isEncrypted(encrypted);
      const hash = await EncryptionService.hashData(testData);
      
      return {
        success: encryptionWorking,
        message: encryptionWorking 
          ? 'Encryption/decryption working correctly' 
          : 'Encryption/decryption failed',
        details: {
          originalData: testData,
          encrypted: encrypted.substring(0, 50) + '...',
          decrypted,
          isEncryptedDetected: isEncryptedCheck,
          hash: hash.substring(0, 16) + '...'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Encryption test failed: ${error}`,
        details: error
      };
    }
  }

  // Run comprehensive test suite
  static async runFullTestSuite(agentId: string): Promise<{
    success: boolean;
    message: string;
    results: {
      database: any;
      tables: any;
      services: any;
      encryption: any;
    };
  }> {
    console.log('🧪 Starting RAG system test suite...');
    
    const results = {
      database: await this.testDatabaseConnection(),
      tables: await this.testRAGTableAccess(agentId),
      services: await this.testRAGServices(agentId),
      encryption: await this.testEncryption()
    };

    const allTestsPassed = Object.values(results).every(result => result.success);

    console.log('🧪 Test suite completed:', {
      database: results.database.success ? '✅' : '❌',
      tables: results.tables.success ? '✅' : '❌',
      services: results.services.success ? '✅' : '❌',
      encryption: results.encryption.success ? '✅' : '❌'
    });

    return {
      success: allTestsPassed,
      message: allTestsPassed 
        ? 'All RAG system tests passed!' 
        : 'Some RAG system tests failed',
      results
    };
  }
}
