
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
    crawl_status?: string;
    progress?: number;
    links_count?: number;
    parent_source_id?: string;
    is_excluded?: boolean;
  }): Promise<AgentSource> {
    // Get the team_id from the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('team_id')
      .eq('id', data.agent_id)
      .single();

    if (agentError) throw new Error(`Failed to fetch agent: ${agentError.message}`);
    if (!agent) throw new Error('Agent not found');

    // Create the source with team_id included
    const sourceData = {
      ...data,
      team_id: agent.team_id
    };

    const { data: source, error } = await supabase
      .from('agent_sources')
      .insert(sourceData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create source: ${error.message}`);
    return {
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    };
  }

  // Get all sources for an agent - optimized query
  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select(`
        id,
        agent_id,
        source_type,
        title,
        content,
        metadata,
        file_path,
        url,
        is_active,
        created_at,
        updated_at,
        created_by,
        team_id,
        crawl_status,
        progress,
        links_count,
        parent_source_id,
        is_excluded,
        last_crawled_at
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100); // Add reasonable limit to prevent timeouts

    if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
    return (sources || []).map(source => ({
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    }));
  }

  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select(`
        id,
        agent_id,
        source_type,
        title,
        content,
        metadata,
        file_path,
        url,
        is_active,
        created_at,
        updated_at,
        created_by,
        team_id,
        crawl_status,
        progress,
        links_count,
        parent_source_id,
        is_excluded,
        last_crawled_at
      `)
      .eq('agent_id', agentId)
      .eq('source_type', sourceType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50); // Smaller limit for type-specific queries

    if (error) throw new Error(`Failed to fetch sources by type: ${error.message}`);
    return (sources || []).map(source => ({
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    }));
  }

  static async updateSource(id: string, updates: Partial<AgentSource & {
    crawl_status?: string;
    progress?: number;
    links_count?: number;
    is_excluded?: boolean;
    last_crawled_at?: string;
  }>): Promise<AgentSource> {
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

  static async deactivateSource(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('agent_sources')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(`Failed to deactivate source: ${error.message}`);
    return true;
  }

  static async deleteSource(id: string): Promise<boolean> {
    // First check if this source has child sources
    const { data: childSources, error: childError } = await supabase
      .from('agent_sources')
      .select('id')
      .eq('parent_source_id', id);

    if (childError) throw new Error(`Failed to check child sources: ${childError.message}`);

    // If there are child sources, delete them first
    if (childSources && childSources.length > 0) {
      const { error: deleteChildrenError } = await supabase
        .from('agent_sources')
        .delete()
        .eq('parent_source_id', id);

      if (deleteChildrenError) throw new Error(`Failed to delete child sources: ${deleteChildrenError.message}`);
    }

    // Now delete the parent source
    const { error } = await supabase
      .from('agent_sources')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete source: ${error.message}`);
    return true;
  }

  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    // Simplified query to avoid complex joins that might timeout
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch source: ${error.message}`);
    
    // Get chunk count separately to avoid timeout
    const { count: chunksCount } = await supabase
      .from('source_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', id);
    
    return {
      ...source,
      metadata: source.metadata as Record<string, any> || {},
      chunks_count: chunksCount || 0
    };
  }
}
