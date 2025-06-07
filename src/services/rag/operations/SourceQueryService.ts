
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceType } from "@/types/rag";
import { BaseSourceService } from "../base/BaseSourceService";
import { fetchMaybeSingle } from "@/utils/safeSupabaseQueries";

export class SourceQueryService extends BaseSourceService {
  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    console.log(`📖 Fetching sources for agent: ${agentId}`);
    
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sources:', error);
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }

    console.log(`✅ Found ${sources?.length || 0} sources`);
    return this.formatSources(sources || []);
  }

  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    console.log(`📖 Fetching ${sourceType} sources for agent: ${agentId}`);
    
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('agent_id', agentId)
      .eq('source_type', sourceType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sources by type:', error);
      throw new Error(`Failed to fetch ${sourceType} sources: ${error.message}`);
    }

    console.log(`✅ Found ${sources?.length || 0} ${sourceType} sources`);
    return this.formatSources(sources || []);
  }

  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    console.log(`📖 Fetching source with stats: ${id}`);
    
    // Use safe query for source fetch
    const source = await fetchMaybeSingle(
      supabase
        .from('agent_sources')
        .select('*')
        .eq('id', id),
      `getSourceWithStats(${id})`
    );

    if (!source) {
      throw new Error('Source not found');
    }

    // Get chunks count
    const { count: chunksCount, error: chunksError } = await supabase
      .from('source_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', id);

    if (chunksError) {
      console.error('❌ Error counting chunks:', chunksError);
    }

    const formattedSource = this.formatSource(source);
    
    return {
      ...formattedSource,
      chunks_count: chunksCount || 0
    };
  }

  static async getSourcesPaginated(
    agentId: string,
    sourceType?: SourceType,
    page: number = 1,
    pageSize: number = 25
  ): Promise<{
    sources: AgentSource[];
    totalCount: number;
    totalPages: number;
  }> {
    console.log(`📖 Fetching paginated sources for agent: ${agentId}, type: ${sourceType}, page: ${page}`);
    
    const offset = (page - 1) * pageSize;
    let query = supabase
      .from('agent_sources')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    const { data: sources, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ Error fetching paginated sources:', error);
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    console.log(`✅ Found ${sources?.length || 0} sources (${totalCount} total)`);
    
    return {
      sources: this.formatSources(sources || []),
      totalCount,
      totalPages
    };
  }
}
