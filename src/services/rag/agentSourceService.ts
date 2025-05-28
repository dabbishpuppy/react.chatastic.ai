
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceType } from "@/types/rag";

export class AgentSourceService {
  // Create a new agent source
  static async createSource(data: {
    agent_id: string;
    source_type: SourceType;
    title: string;
    content?: string;
    metadata?: Record<string, any>;
    file_path?: string;
    url?: string;
  }): Promise<AgentSource> {
    const { data: source, error } = await supabase
      .from('agent_sources')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Failed to create source: ${error.message}`);
    return {
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    };
  }

  // Get all sources for an agent
  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
    return (sources || []).map(source => ({
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    }));
  }

  // Get sources by type for an agent
  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('agent_id', agentId)
      .eq('source_type', sourceType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch sources by type: ${error.message}`);
    return (sources || []).map(source => ({
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    }));
  }

  // Update a source
  static async updateSource(id: string, updates: Partial<AgentSource>): Promise<AgentSource> {
    const { data: source, error } = await supabase
      .from('agent_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update source: ${error.message}`);
    return {
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    };
  }

  // Soft delete a source (mark as inactive)
  static async deactivateSource(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('agent_sources')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(`Failed to deactivate source: ${error.message}`);
    return true;
  }

  // Hard delete a source and all related data
  static async deleteSource(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('agent_sources')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete source: ${error.message}`);
    return true;
  }

  // Get source with chunks count
  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    const { data, error } = await supabase
      .from('agent_sources')
      .select(`
        *,
        source_chunks(count)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch source with stats: ${error.message}`);
    
    return {
      ...data,
      metadata: data.metadata as Record<string, any> || {},
      chunks_count: data.source_chunks?.[0]?.count || 0
    };
  }
}
