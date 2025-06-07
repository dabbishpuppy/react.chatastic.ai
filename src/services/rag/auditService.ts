
import { supabase } from "@/integrations/supabase/client";
import { AuditLog, AuditAction } from "@/types/rag";

export class AuditService {
  // Log an action manually (automatic logging is handled by triggers)
  static async logAction(data: {
    action: AuditAction;
    resource_type: string;
    resource_id?: string;
    agent_id?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
  }): Promise<AuditLog> {
    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        ...data,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to log action: ${error.message}`);
    return {
      ...log,
      ip_address: log.ip_address as string || null,
      old_values: log.old_values as Record<string, any> || undefined,
      new_values: log.new_values as Record<string, any> || undefined
    };
  }

  // Get audit logs for a team
  static async getTeamLogs(
    teamId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch team logs: ${error.message}`);
    return (logs || []).map(log => ({
      ...log,
      ip_address: log.ip_address as string || null,
      old_values: log.old_values as Record<string, any> || undefined,
      new_values: log.new_values as Record<string, any> || undefined
    }));
  }

  // Get audit logs for an agent
  static async getAgentLogs(
    agentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch agent logs: ${error.message}`);
    return (logs || []).map(log => ({
      ...log,
      ip_address: log.ip_address as string || null,
      old_values: log.old_values as Record<string, any> || undefined,
      new_values: log.new_values as Record<string, any> || undefined
    }));
  }

  // Get logs by action type
  static async getLogsByAction(
    action: AuditAction,
    teamId?: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch logs by action: ${error.message}`);
    return (logs || []).map(log => ({
      ...log,
      ip_address: log.ip_address as string || null,
      old_values: log.old_values as Record<string, any> || undefined,
      new_values: log.new_values as Record<string, any> || undefined
    }));
  }

  // Export audit logs for GDPR compliance
  static async exportLogs(teamId: string): Promise<AuditLog[]> {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to export logs: ${error.message}`);
    
    // Log the export action
    await this.logAction({
      action: 'export',
      resource_type: 'audit_logs',
      resource_id: teamId
    });

    return (logs || []).map(log => ({
      ...log,
      ip_address: log.ip_address as string || null,
      old_values: log.old_values as Record<string, any> || undefined,
      new_values: log.new_values as Record<string, any> || undefined
    }));
  }

  // Helper to get client IP (simplified for now)
  private static async getClientIP(): Promise<string | null> {
    try {
      // In production, this would get the real client IP
      // For now, we'll return null and let the database handle it
      return null;
    } catch {
      return null;
    }
  }
}
