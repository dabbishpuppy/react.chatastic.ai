
import { supabase } from "@/integrations/supabase/client";
import { GDPRService } from "@/services/rag/gdprService";
import { AuditService } from "@/services/rag/auditService";

export interface ComplianceReport {
  id: string;
  type: 'gdpr' | 'ccpa' | 'hipaa' | 'soc2';
  status: 'compliant' | 'non_compliant' | 'partial';
  score: number;
  findings: ComplianceFinding[];
  recommendations: string[];
  generatedAt: string;
  validUntil: string;
}

export interface ComplianceFinding {
  id: string;
  requirement: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  evidence?: string;
  remediation?: string;
}

export interface DataProcessingRecord {
  id: string;
  purpose: string;
  dataTypes: string[];
  retention: number;
  thirdParties: string[];
  legalBasis: string;
  consents: string[];
}

export class ComplianceService {
  // Generate comprehensive compliance report
  static async generateComplianceReport(
    teamId: string, 
    type: ComplianceReport['type']
  ): Promise<ComplianceReport> {
    console.log(`📋 Generating ${type.toUpperCase()} compliance report for team: ${teamId}`);

    const findings: ComplianceFinding[] = [];
    const recommendations: string[] = [];

    switch (type) {
      case 'gdpr':
        findings.push(...await this.assessGDPRCompliance(teamId));
        break;
      case 'ccpa':
        findings.push(...await this.assessCCPACompliance(teamId));
        break;
      case 'hipaa':
        findings.push(...await this.assessHIPAACompliance(teamId));
        break;
      case 'soc2':
        findings.push(...await this.assessSOC2Compliance(teamId));
        break;
    }

    // Calculate compliance score
    const passCount = findings.filter(f => f.status === 'pass').length;
    const totalCount = findings.length;
    const score = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

    // Determine overall status
    const failCount = findings.filter(f => f.status === 'fail').length;
    const warningCount = findings.filter(f => f.status === 'warning').length;

    let status: ComplianceReport['status'] = 'compliant';
    if (failCount > 0) {
      status = 'non_compliant';
    } else if (warningCount > 0) {
      status = 'partial';
    }

    // Generate recommendations
    if (failCount > 0) {
      recommendations.push('Address all failed compliance requirements immediately');
    }
    if (warningCount > 0) {
      recommendations.push('Review and improve warning items for better compliance');
    }
    recommendations.push('Regular compliance audits and monitoring');
    recommendations.push('Staff training on compliance requirements');

    return {
      id: `compliance-${type}-${Date.now()}`,
      type,
      status,
      score,
      findings,
      recommendations,
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
    };
  }

  // Assess GDPR compliance
  private static async assessGDPRCompliance(teamId: string): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];

    // Check for lawful basis documentation
    const { data: consents } = await supabase
      .from('user_consents')
      .select('*')
      .eq('team_id', teamId);

    findings.push({
      id: 'gdpr-lawful-basis',
      requirement: 'Lawful basis for processing',
      status: consents && consents.length > 0 ? 'pass' : 'fail',
      description: 'Documented lawful basis for personal data processing',
      evidence: consents ? `${consents.length} consent records found` : 'No consent records found',
      remediation: !consents ? 'Implement consent management system' : undefined
    });

    // Check for data retention policies
    const { data: retentionPolicies } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('team_id', teamId);

    findings.push({
      id: 'gdpr-retention',
      requirement: 'Data retention policies',
      status: retentionPolicies && retentionPolicies.length > 0 ? 'pass' : 'fail',
      description: 'Defined data retention and deletion policies',
      evidence: retentionPolicies ? `${retentionPolicies.length} policies defined` : 'No retention policies found',
      remediation: !retentionPolicies ? 'Define data retention policies for all data types' : undefined
    });

    // Check for audit logs
    const auditLogs = await AuditService.getTeamLogs(teamId, 10);
    findings.push({
      id: 'gdpr-audit-trail',
      requirement: 'Audit trail for data processing',
      status: auditLogs.length > 0 ? 'pass' : 'warning',
      description: 'Comprehensive audit trail for all data processing activities',
      evidence: `${auditLogs.length} audit records found`,
      remediation: auditLogs.length === 0 ? 'Enable comprehensive audit logging' : undefined
    });

    // Check for privacy by design
    const { data: agents } = await supabase
      .from('agents')
      .select('visibility, rate_limit_enabled')
      .eq('team_id', teamId);

    const privateAgents = agents?.filter(a => a.visibility === 'private').length || 0;
    const rateLimitedAgents = agents?.filter(a => a.rate_limit_enabled).length || 0;
    const totalAgents = agents?.length || 0;

    findings.push({
      id: 'gdpr-privacy-by-design',
      requirement: 'Privacy by design and default',
      status: (privateAgents / totalAgents) > 0.5 && (rateLimitedAgents / totalAgents) > 0.5 ? 'pass' : 'warning',
      description: 'Privacy considerations built into system design',
      evidence: `${privateAgents}/${totalAgents} agents private, ${rateLimitedAgents}/${totalAgents} rate limited`,
      remediation: 'Review agent configurations for privacy-first defaults'
    });

    return findings;
  }

  // Assess CCPA compliance
  private static async assessCCPACompliance(teamId: string): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];

    // CCPA has similar requirements to GDPR for user rights
    findings.push({
      id: 'ccpa-consumer-rights',
      requirement: 'Consumer rights implementation',
      status: 'warning',
      description: 'Right to know, delete, and opt-out of sale',
      evidence: 'Manual assessment required',
      remediation: 'Implement consumer rights request handling'
    });

    findings.push({
      id: 'ccpa-data-disclosure',
      requirement: 'Data collection disclosure',
      status: 'warning',
      description: 'Clear disclosure of data collection practices',
      evidence: 'Privacy policy review required',
      remediation: 'Update privacy policy with CCPA-compliant disclosures'
    });

    return findings;
  }

  // Assess HIPAA compliance
  private static async assessHIPAACompliance(teamId: string): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];

    // HIPAA requires additional security measures
    findings.push({
      id: 'hipaa-encryption',
      requirement: 'Data encryption at rest and in transit',
      status: 'warning',
      description: 'All PHI must be encrypted using approved methods',
      evidence: 'Encryption audit required',
      remediation: 'Implement FIPS 140-2 compliant encryption'
    });

    findings.push({
      id: 'hipaa-access-controls',
      requirement: 'Role-based access controls',
      status: 'warning',
      description: 'Minimum necessary access principle',
      evidence: 'Access control review required',
      remediation: 'Implement granular role-based access controls'
    });

    findings.push({
      id: 'hipaa-audit-logs',
      requirement: 'Comprehensive audit logging',
      status: 'warning',
      description: 'All PHI access must be logged and monitored',
      evidence: 'Audit logging review required',
      remediation: 'Enhanced audit logging for PHI access'
    });

    return findings;
  }

  // Assess SOC 2 compliance
  private static async assessSOC2Compliance(teamId: string): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];

    // Security principle
    findings.push({
      id: 'soc2-security',
      requirement: 'Security controls and monitoring',
      status: 'warning',
      description: 'Comprehensive security controls and monitoring',
      evidence: 'Security assessment required',
      remediation: 'Implement SOC 2 security framework'
    });

    // Availability principle
    findings.push({
      id: 'soc2-availability',
      requirement: 'System availability and performance',
      status: 'warning',
      description: 'System availability monitoring and incident response',
      evidence: 'Availability metrics review required',
      remediation: 'Implement availability monitoring and SLA tracking'
    });

    return findings;
  }

  // Create data processing record
  static async createDataProcessingRecord(
    teamId: string,
    record: Omit<DataProcessingRecord, 'id'>
  ): Promise<DataProcessingRecord> {
    const processingRecord: DataProcessingRecord = {
      id: `dpr-${Date.now()}`,
      ...record
    };

    // Store in audit logs for compliance tracking
    await AuditService.logAction({
      action: 'create',
      resource_type: 'data_processing_record',
      resource_id: processingRecord.id,
      new_values: processingRecord
    });

    return processingRecord;
  }

  // Generate data subject access report
  static async generateDataSubjectAccessReport(
    teamId: string,
    subjectId: string
  ): Promise<{
    personalData: any[];
    processingActivities: string[];
    retentionPeriods: Record<string, number>;
    thirdPartySharing: string[];
  }> {
    console.log(`📊 Generating data subject access report for ${subjectId}`);

    // Collect all personal data
    const personalData: any[] = [];

    // Get user consents
    const consents = await GDPRService.getUserConsents(teamId);
    personalData.push(...consents);

    // Get conversation data (if applicable)
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', subjectId);

    if (conversations) {
      personalData.push(...conversations);
    }

    // Get audit logs
    const auditLogs = await AuditService.getTeamLogs(teamId);
    const userAuditLogs = auditLogs.filter(log => 
      log.user_id === subjectId || 
      (log.old_values as any)?.subject_id === subjectId ||
      (log.new_values as any)?.subject_id === subjectId
    );
    personalData.push(...userAuditLogs);

    return {
      personalData,
      processingActivities: [
        'Customer support chatbot interactions',
        'Service improvement analytics',
        'Security monitoring'
      ],
      retentionPeriods: {
        'conversations': 365,
        'audit_logs': 2555, // 7 years
        'user_consents': 2555
      },
      thirdPartySharing: [
        'Cloud infrastructure providers (AWS, Google Cloud)',
        'Analytics providers (if configured)'
      ]
    };
  }

  // Automated compliance monitoring
  static async startComplianceMonitoring(teamId: string): Promise<void> {
    console.log(`🔍 Starting compliance monitoring for team: ${teamId}`);

    // Daily compliance checks
    setInterval(async () => {
      try {
        // Check data retention compliance
        await this.checkDataRetentionCompliance(teamId);
        
        // Check consent validity
        await this.checkConsentCompliance(teamId);
        
      } catch (error) {
        console.error('Compliance monitoring error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  // Check data retention compliance
  private static async checkDataRetentionCompliance(teamId: string): Promise<void> {
    const { data: policies } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('team_id', teamId);

    if (!policies) return;

    for (const policy of policies) {
      if (policy.auto_delete) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

        // This would typically trigger data deletion
        console.log(`🗑️ Data retention check: ${policy.resource_type} older than ${policy.retention_days} days`);
      }
    }
  }

  // Check consent compliance
  private static async checkConsentCompliance(teamId: string): Promise<void> {
    const consents = await GDPRService.getUserConsents(teamId);
    
    for (const consent of consents) {
      if (consent.consented && consent.consent_date) {
        const consentAge = Date.now() - new Date(consent.consent_date).getTime();
        const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
        
        if (consentAge > maxAge) {
          console.warn(`⚠️ Consent renewal required for ${consent.user_id}`);
        }
      }
    }
  }
}
