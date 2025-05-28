
import { supabase } from "@/integrations/supabase/client";
import { DataRetentionPolicy } from "@/types/rag";

export class DataRetentionService {
  // Create retention policy
  static async createPolicy(data: {
    team_id: string;
    resource_type: string;
    retention_days: number;
    auto_delete: boolean;
  }): Promise<DataRetentionPolicy> {
    const { data: policy, error } = await supabase
      .from('data_retention_policies')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Failed to create retention policy: ${error.message}`);
    return policy;
  }

  // Get retention policies for a team
  static async getTeamPolicies(teamId: string): Promise<DataRetentionPolicy[]> {
    const { data: policies, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch retention policies: ${error.message}`);
    return policies || [];
  }

  // Update retention policy
  static async updatePolicy(
    id: string,
    updates: Partial<DataRetentionPolicy>
  ): Promise<DataRetentionPolicy> {
    const { data: policy, error } = await supabase
      .from('data_retention_policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update retention policy: ${error.message}`);
    return policy;
  }

  // Delete retention policy
  static async deletePolicy(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('data_retention_policies')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete retention policy: ${error.message}`);
    return true;
  }

  // Run cleanup based on retention policies (uses database function)
  static async runCleanup(): Promise<number> {
    const { data, error } = await supabase.rpc('cleanup_expired_data');

    if (error) throw new Error(`Failed to run cleanup: ${error.message}`);
    return data || 0;
  }

  // Get data that would be affected by cleanup
  static async previewCleanup(teamId: string): Promise<{
    resource_type: string;
    count: number;
    oldest_date: string;
  }[]> {
    const { data, error } = await supabase.rpc('preview_cleanup_data', {
      team_id: teamId
    });

    if (error) throw new Error(`Failed to preview cleanup: ${error.message}`);
    return data || [];
  }

  // Set default retention policies for a new team
  static async setDefaultPolicies(teamId: string): Promise<DataRetentionPolicy[]> {
    const defaultPolicies = [
      {
        team_id: teamId,
        resource_type: 'audit_logs',
        retention_days: 365,
        auto_delete: false
      },
      {
        team_id: teamId,
        resource_type: 'sources',
        retention_days: 1095, // 3 years
        auto_delete: false
      },
      {
        team_id: teamId,
        resource_type: 'conversations',
        retention_days: 730, // 2 years
        auto_delete: false
      }
    ];

    const { data: policies, error } = await supabase
      .from('data_retention_policies')
      .insert(defaultPolicies)
      .select();

    if (error) throw new Error(`Failed to set default policies: ${error.message}`);
    return policies || [];
  }
}
