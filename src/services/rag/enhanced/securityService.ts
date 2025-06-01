
import { supabase } from "@/integrations/supabase/client";
import { EncryptionService } from "@/services/rag/encryptionService";

export interface SecurityAuditResult {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  compliance: ComplianceStatus;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  location: string;
  recommendation: string;
  cve?: string;
}

export interface ComplianceStatus {
  gdpr: boolean;
  ccpa: boolean;
  hipaa: boolean;
  soc2: boolean;
  iso27001: boolean;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'monitor' | 'quarantine';
  priority: number;
}

export class SecurityService {
  private static securityPolicies: SecurityPolicy[] = [];
  private static isInitialized = false;

  // Initialize security service
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔒 Initializing security service...');
    
    // Load default security policies
    this.securityPolicies = this.getDefaultPolicies();
    
    // Start security monitoring
    this.startSecurityMonitoring();

    this.isInitialized = true;
    console.log('✅ Security service initialized');
  }

  // Perform comprehensive security audit
  static async performSecurityAudit(teamId: string): Promise<SecurityAuditResult> {
    console.log(`🔍 Starting security audit for team: ${teamId}`);

    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Check for common vulnerabilities
    const sqlInjectionVulns = await this.checkSQLInjectionVulnerabilities(teamId);
    const xssVulns = await this.checkXSSVulnerabilities(teamId);
    const authVulns = await this.checkAuthenticationVulnerabilities(teamId);
    const dataVulns = await this.checkDataExposureVulnerabilities(teamId);

    vulnerabilities.push(...sqlInjectionVulns, ...xssVulns, ...authVulns, ...dataVulns);

    // Generate recommendations
    if (vulnerabilities.length > 0) {
      recommendations.push('Enable rate limiting on all endpoints');
      recommendations.push('Implement input validation and sanitization');
      recommendations.push('Enable HTTPS for all communications');
      recommendations.push('Regular security updates and patches');
    }

    // Check compliance status
    const compliance = await this.checkComplianceStatus(teamId);

    // Calculate security score
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    const score = Math.max(0, 100 - (criticalCount * 25 + highCount * 10 + mediumCount * 5));

    return {
      score,
      vulnerabilities,
      recommendations,
      compliance
    };
  }

  // Check for SQL injection vulnerabilities
  private static async checkSQLInjectionVulnerabilities(teamId: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check agent sources for potential SQL injection patterns
    const { data: sources } = await supabase
      .from('agent_sources')
      .select('id, content, url')
      .eq('team_id', teamId);

    if (sources) {
      for (const source of sources) {
        if (source.content && this.containsSQLInjectionPattern(source.content)) {
          vulnerabilities.push({
            id: `sql-injection-${source.id}`,
            severity: 'high',
            type: 'SQL Injection',
            description: 'Potential SQL injection patterns detected in source content',
            location: `Source: ${source.id}`,
            recommendation: 'Sanitize and validate all input data before processing'
          });
        }
      }
    }

    return vulnerabilities;
  }

  // Check for XSS vulnerabilities
  private static async checkXSSVulnerabilities(teamId: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check conversation messages for XSS patterns
    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, conversation_id')
      .in('conversation_id', 
        supabase.from('conversations')
          .select('id')
          .in('agent_id', 
            supabase.from('agents')
              .select('id')
              .eq('team_id', teamId)
          )
      );

    if (messages) {
      for (const message of messages) {
        if (this.containsXSSPattern(message.content)) {
          vulnerabilities.push({
            id: `xss-${message.id}`,
            severity: 'medium',
            type: 'Cross-Site Scripting',
            description: 'Potential XSS patterns detected in message content',
            location: `Message: ${message.id}`,
            recommendation: 'Implement content sanitization and output encoding'
          });
        }
      }
    }

    return vulnerabilities;
  }

  // Check authentication vulnerabilities
  private static async checkAuthenticationVulnerabilities(teamId: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for weak rate limiting settings
    const { data: agents } = await supabase
      .from('agents')
      .select('id, rate_limit_enabled, rate_limit_messages, rate_limit_time_window')
      .eq('team_id', teamId);

    if (agents) {
      for (const agent of agents) {
        if (!agent.rate_limit_enabled) {
          vulnerabilities.push({
            id: `auth-no-rate-limit-${agent.id}`,
            severity: 'medium',
            type: 'Authentication',
            description: 'Rate limiting is disabled',
            location: `Agent: ${agent.id}`,
            recommendation: 'Enable rate limiting to prevent abuse'
          });
        } else if (agent.rate_limit_messages > 100) {
          vulnerabilities.push({
            id: `auth-weak-rate-limit-${agent.id}`,
            severity: 'low',
            type: 'Authentication',
            description: 'Rate limit threshold is too high',
            location: `Agent: ${agent.id}`,
            recommendation: 'Reduce rate limit threshold for better security'
          });
        }
      }
    }

    return vulnerabilities;
  }

  // Check data exposure vulnerabilities
  private static async checkDataExposureVulnerabilities(teamId: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for public agents with sensitive data
    const { data: publicAgents } = await supabase
      .from('agents')
      .select('id, visibility, name')
      .eq('team_id', teamId)
      .eq('visibility', 'public');

    if (publicAgents && publicAgents.length > 0) {
      vulnerabilities.push({
        id: `data-exposure-public-agents`,
        severity: 'low',
        type: 'Data Exposure',
        description: `${publicAgents.length} agents are publicly accessible`,
        location: 'Agent visibility settings',
        recommendation: 'Review public agent configurations and ensure no sensitive data is exposed'
      });
    }

    return vulnerabilities;
  }

  // Check compliance status
  private static async checkComplianceStatus(teamId: string): Promise<ComplianceStatus> {
    // Check for GDPR compliance indicators
    const { data: consents } = await supabase
      .from('user_consents')
      .select('consent_type, consented')
      .eq('team_id', teamId);

    const hasGDPRConsent = consents?.some(c => c.consent_type === 'data_processing' && c.consented);

    // Check for data retention policies
    const { data: retentionPolicies } = await supabase
      .from('data_retention_policies')
      .select('resource_type')
      .eq('team_id', teamId);

    const hasRetentionPolicies = retentionPolicies && retentionPolicies.length > 0;

    return {
      gdpr: hasGDPRConsent || false,
      ccpa: hasGDPRConsent || false, // Similar requirements
      hipaa: false, // Requires additional encryption and access controls
      soc2: hasRetentionPolicies || false,
      iso27001: false // Requires comprehensive security management
    };
  }

  // Content pattern detection
  private static containsSQLInjectionPattern(content: string): boolean {
    const sqlPatterns = [
      /union\s+select/i,
      /\'\s*or\s+\'\d+\'\s*=\s*\'\d+/i,
      /\'\s*;\s*drop\s+table/i,
      /\'\s*;\s*delete\s+from/i,
      /\'\s*;\s*update\s+\w+\s+set/i
    ];

    return sqlPatterns.some(pattern => pattern.test(content));
  }

  private static containsXSSPattern(content: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i
    ];

    return xssPatterns.some(pattern => pattern.test(content));
  }

  // Start security monitoring
  private static startSecurityMonitoring(): void {
    console.log('🛡️ Starting security monitoring...');

    // Monitor for suspicious activities every 5 minutes
    setInterval(async () => {
      await this.monitorSuspiciousActivities();
    }, 300000);
  }

  // Monitor suspicious activities
  private static async monitorSuspiciousActivities(): Promise<void> {
    try {
      // Check for unusual API activity
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('conversation_id, created_at')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

      if (recentMessages && recentMessages.length > 1000) {
        console.warn('🚨 High message volume detected - potential DoS attack');
      }

      // Check for failed crawl jobs
      const { data: failedJobs } = await supabase
        .from('crawl_jobs')
        .select('error_message, created_at')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 300000).toISOString());

      if (failedJobs && failedJobs.length > 50) {
        console.warn('🚨 High crawl failure rate detected');
      }

    } catch (error) {
      console.error('Error monitoring security:', error);
    }
  }

  // Get default security policies
  private static getDefaultPolicies(): SecurityPolicy[] {
    return [
      {
        id: 'sql-injection-prevention',
        name: 'SQL Injection Prevention',
        description: 'Prevent SQL injection attacks in user inputs',
        enabled: true,
        severity: 'critical',
        rules: [
          {
            id: 'block-sql-keywords',
            condition: 'content contains SQL keywords',
            action: 'deny',
            priority: 1
          }
        ]
      },
      {
        id: 'xss-prevention',
        name: 'Cross-Site Scripting Prevention',
        description: 'Prevent XSS attacks in content',
        enabled: true,
        severity: 'high',
        rules: [
          {
            id: 'block-script-tags',
            condition: 'content contains script tags',
            action: 'quarantine',
            priority: 2
          }
        ]
      },
      {
        id: 'rate-limiting',
        name: 'Rate Limiting',
        description: 'Limit request rates to prevent abuse',
        enabled: true,
        severity: 'medium',
        rules: [
          {
            id: 'limit-requests',
            condition: 'requests exceed threshold',
            action: 'deny',
            priority: 3
          }
        ]
      }
    ];
  }

  // Apply security policies to content
  static async applySecurityPolicies(content: string, source: string): Promise<{
    allowed: boolean;
    action: string;
    reason?: string;
  }> {
    for (const policy of this.securityPolicies) {
      if (!policy.enabled) continue;

      for (const rule of policy.rules) {
        const violation = this.checkRule(content, rule);
        if (violation) {
          console.warn(`🚨 Security policy violation: ${policy.name} - ${rule.condition}`);
          
          return {
            allowed: rule.action === 'allow',
            action: rule.action,
            reason: `Violated policy: ${policy.name}`
          };
        }
      }
    }

    return { allowed: true, action: 'allow' };
  }

  // Check individual security rule
  private static checkRule(content: string, rule: SecurityRule): boolean {
    switch (rule.condition) {
      case 'content contains SQL keywords':
        return this.containsSQLInjectionPattern(content);
      case 'content contains script tags':
        return this.containsXSSPattern(content);
      default:
        return false;
    }
  }

  // Encrypt sensitive data in sources
  static async encryptSensitiveSource(sourceId: string): Promise<void> {
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('content')
      .eq('id', sourceId)
      .single();

    if (error || !source?.content) {
      throw new Error('Source not found or no content to encrypt');
    }

    const encryptedContent = await EncryptionService.encryptSensitiveData(source.content);
    
    await supabase
      .from('agent_sources')
      .update({ 
        content: encryptedContent,
        metadata: { encrypted: true, encryption_date: new Date().toISOString() }
      })
      .eq('id', sourceId);

    console.log(`🔒 Source ${sourceId} encrypted successfully`);
  }

  // Get security dashboard data
  static async getSecurityDashboard(teamId: string): Promise<{
    securityScore: number;
    vulnerabilityCount: number;
    complianceStatus: ComplianceStatus;
    recentAlerts: number;
  }> {
    const auditResult = await this.performSecurityAudit(teamId);
    
    return {
      securityScore: auditResult.score,
      vulnerabilityCount: auditResult.vulnerabilities.length,
      complianceStatus: auditResult.compliance,
      recentAlerts: auditResult.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length
    };
  }
}
