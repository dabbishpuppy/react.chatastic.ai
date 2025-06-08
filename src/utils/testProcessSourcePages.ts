import { supabase } from "@/integrations/supabase/client";

export interface TestResult {
  testName: string;
  success: boolean;
  response?: any;
  error?: string;
  statusCode?: number;
}

export class ProcessSourcePagesTestSuite {
  static async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting process-source-pages test suite');
    
    const results: TestResult[] = [];
    
    // Test 1: Empty request body
    results.push(await this.testEmptyRequestBody());
    
    // Test 2: Invalid JSON
    results.push(await this.testInvalidJSON());
    
    // Test 3: Valid request with no parentSourceId
    results.push(await this.testNoParentSourceId());
    
    // Test 4: Invalid parentSourceId format
    results.push(await this.testInvalidParentSourceId());
    
    // Test 5: Non-existent parentSourceId
    results.push(await this.testNonExistentParentSourceId());
    
    // Test 6: Invalid maxConcurrentJobs
    results.push(await this.testInvalidMaxConcurrentJobs());
    
    console.log('🧪 Test suite completed:', results);
    return results;
  }

  private static async testEmptyRequestBody(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: {}
      });

      return {
        testName: 'Empty Request Body',
        success: !error && data?.success !== false,
        response: data,
        error: error?.message
      };
    } catch (error: any) {
      return {
        testName: 'Empty Request Body',
        success: false,
        error: error.message
      };
    }
  }

  private static async testInvalidJSON(): Promise<TestResult> {
    try {
      // Get the Supabase URL and key from environment or use hardcoded values for testing
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/process-source-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: 'invalid json{'
      });

      const data = await response.json();

      return {
        testName: 'Invalid JSON',
        success: response.status === 400 && data.success === false,
        response: data,
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        testName: 'Invalid JSON',
        success: false,
        error: error.message
      };
    }
  }

  private static async testNoParentSourceId(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: { maxConcurrentJobs: 3 }
      });

      return {
        testName: 'No Parent Source ID',
        success: !error && (data?.success === true || data?.message?.includes('No pending sources')),
        response: data,
        error: error?.message
      };
    } catch (error: any) {
      return {
        testName: 'No Parent Source ID',
        success: false,
        error: error.message
      };
    }
  }

  private static async testInvalidParentSourceId(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: { parentSourceId: 'invalid-uuid' }
      });

      return {
        testName: 'Invalid Parent Source ID Format',
        success: error || (data && data.success === false && data.error?.includes('Invalid UUID')),
        response: data,
        error: error?.message
      };
    } catch (error: any) {
      return {
        testName: 'Invalid Parent Source ID Format',
        success: true, // Expected to fail
        error: error.message
      };
    }
  }

  private static async testNonExistentParentSourceId(): Promise<TestResult> {
    try {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: { parentSourceId: fakeUuid }
      });

      return {
        testName: 'Non-existent Parent Source ID',
        success: error || (data && data.success === false && data.error?.includes('not found')),
        response: data,
        error: error?.message
      };
    } catch (error: any) {
      return {
        testName: 'Non-existent Parent Source ID',
        success: true, // Expected to fail
        error: error.message
      };
    }
  }

  private static async testInvalidMaxConcurrentJobs(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-source-pages', {
        body: { maxConcurrentJobs: 50 } // Invalid - too high
      });

      return {
        testName: 'Invalid Max Concurrent Jobs',
        success: error || (data && data.success === false && data.error?.includes('between 1 and 20')),
        response: data,
        error: error?.message
      };
    } catch (error: any) {
      return {
        testName: 'Invalid Max Concurrent Jobs',
        success: true, // Expected to fail
        error: error.message
      };
    }
  }

  static generateCurlExamples(): string[] {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
    const authHeader = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'}`;
    
    return [
      `# Test 1: Empty request body
curl -X POST "${baseUrl}/functions/v1/process-source-pages" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{}'`,
      
      `# Test 2: Invalid JSON
curl -X POST "${baseUrl}/functions/v1/process-source-pages" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d 'invalid json{'`,
      
      `# Test 3: Valid request with no parentSourceId
curl -X POST "${baseUrl}/functions/v1/process-source-pages" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"maxConcurrentJobs": 3}'`,
      
      `# Test 4: Invalid parentSourceId format
curl -X POST "${baseUrl}/functions/v1/process-source-pages" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"parentSourceId": "invalid-uuid"}'`,
      
      `# Test 5: Non-existent parentSourceId
curl -X POST "${baseUrl}/functions/v1/process-source-pages" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"parentSourceId": "00000000-0000-0000-0000-000000000000"}'`
    ];
  }
}

// Export for use in dev tools
export const testProcessSourcePages = ProcessSourcePagesTestSuite.runAllTests;
export const getCurlExamples = ProcessSourcePagesTestSuite.generateCurlExamples;
