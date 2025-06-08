
import { supabase } from "@/integrations/supabase/client";

export interface RLSPolicyCheck {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  userId?: string;
  teamId?: string;
  resourceId?: string;
}

export class RLSPolicyEnforcement {
  /**
   * Validate if a user can perform an operation on a resource
   */
  static async validateAccess(check: RLSPolicyCheck): Promise<{
    allowed: boolean;
    reason?: string;
    policy?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('validate_rls_access', {
        table_name: check.table,
        operation_type: check.operation,
        user_id: check.userId,
        team_id: check.teamId,
        resource_id: check.resourceId
      });

      if (error) {
        console.error('RLS validation error:', error);
        return { allowed: false, reason: 'Policy check failed' };
      }

      return data || { allowed: false, reason: 'No policy result' };
    } catch (error) {
      console.error('RLS validation failed:', error);
      return { allowed: false, reason: 'Validation error' };
    }
  }

  /**
   * Check if user has minimum required role for operation
   */
  static async validateMinimumRole(
    userId: string, 
    teamId: string, 
    requiredRole: 'member' | 'admin' | 'owner'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_minimum_role', {
        user_id_param: userId,
        team_id_param: teamId,
        required_role_param: requiredRole
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Role validation failed:', error);
      return false;
    }
  }

  /**
   * Audit policy violations
   */
  static async logPolicyViolation(violation: {
    table: string;
    operation: string;
    userId?: string;
    teamId?: string;
    violationType: 'insufficient_permissions' | 'missing_team_access' | 'resource_not_found';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.rpc('log_security_violation', {
        violation_data: violation
      });
    } catch (error) {
      console.error('Failed to log policy violation:', error);
    }
  }

  /**
   * Get RLS policy coverage report for a team
   */
  static async getPolicyCoverageReport(teamId: string): Promise<{
    tables: Array<{
      name: string;
      hasSelectPolicy: boolean;
      hasInsertPolicy: boolean;
      hasUpdatePolicy: boolean;
      hasDeletePolicy: boolean;
      missingPolicies: string[];
    }>;
    overallCoverage: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_rls_coverage_report', {
        team_id_param: teamId
      });

      if (error) throw error;
      return data || { tables: [], overallCoverage: 0 };
    } catch (error) {
      console.error('Failed to get coverage report:', error);
      return { tables: [], overallCoverage: 0 };
    }
  }
}
