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
    try {
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
    } catch (error) {
      console.error('Error creating source:', error);
      throw error;
    }
  }

  // Get all sources for an agent with ultra-aggressive optimization
  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    const startTime = Date.now();
    try {
      console.log(`🚀 Starting fetch for agent: ${agentId}`);
      
      // Use ultra-small limit and optimized query structure
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
          team_id,
          crawl_status,
          progress,
          links_count,
          parent_source_id,
          is_excluded,
          last_crawled_at,
          compressed_size,
          original_size,
          compression_ratio,
          extraction_method,
          keywords,
          content_summary,
          raw_text,
          created_by
        `)
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(30); // Even more conservative limit

      const endTime = Date.now();
      console.log(`⏱️ Query completed in ${endTime - startTime}ms`);

      if (error) {
        console.error('❌ Database error fetching sources:', error);
        // Don't throw on timeout/500 errors, return empty array as fallback
        if (error.message?.includes('timeout') || error.message?.includes('500')) {
          console.log('🔄 Returning empty array due to timeout');
          return [];
        }
        throw new Error(`Failed to fetch sources: ${error.message}`);
      }

      const resultCount = sources?.length || 0;
      console.log(`✅ Successfully fetched ${resultCount} sources in ${endTime - startTime}ms`);
      
      return (sources || []).map(source => ({
        ...source,
        metadata: source.metadata as Record<string, any> || {}
      }));
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Error in getSourcesByAgent after ${endTime - startTime}ms:`, error);
      // Return empty array as fallback to prevent app crashes
      return [];
    }
  }

  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    const startTime = Date.now();
    try {
      console.log(`🚀 Starting fetch for ${sourceType} sources, agent: ${agentId}`);
      
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
          team_id,
          crawl_status,
          progress,
          links_count,
          parent_source_id,
          is_excluded,
          last_crawled_at,
          compressed_size,
          original_size,
          compression_ratio,
          extraction_method,
          keywords,
          content_summary,
          raw_text,
          created_by
        `)
        .eq('agent_id', agentId)
        .eq('source_type', sourceType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20); // Even smaller limit for type-specific queries

      const endTime = Date.now();
      console.log(`⏱️ Type-specific query completed in ${endTime - startTime}ms`);

      if (error) {
        console.error(`❌ Database error fetching ${sourceType} sources:`, error);
        // Don't throw on timeout/500 errors, return empty array as fallback
        if (error.message?.includes('timeout') || error.message?.includes('500')) {
          console.log(`🔄 Returning empty array for ${sourceType} due to timeout`);
          return [];
        }
        throw new Error(`Failed to fetch sources by type: ${error.message}`);
      }

      const resultCount = sources?.length || 0;
      console.log(`✅ Successfully fetched ${resultCount} ${sourceType} sources in ${endTime - startTime}ms`);
      
      return (sources || []).map(source => ({
        ...source,
        metadata: source.metadata as Record<string, any> || {}
      }));
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Error in getSourcesByType for ${sourceType} after ${endTime - startTime}ms:`, error);
      // Return empty array as fallback
      return [];
    }
  }

  static async updateSource(id: string, updates: Partial<AgentSource & {
    crawl_status?: string;
    progress?: number;
    links_count?: number;
    is_excluded?: boolean;
    last_crawled_at?: string;
  }>): Promise<AgentSource> {
    try {
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
    } catch (error) {
      console.error('Error updating source:', error);
      throw error;
    }
  }

  static async deactivateSource(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_sources')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw new Error(`Failed to deactivate source: ${error.message}`);
      return true;
    } catch (error) {
      console.error('Error deactivating source:', error);
      throw error;
    }
  }

  static async deleteSource(id: string): Promise<boolean> {
    try {
      // First check if this source has child sources with minimal query
      const { data: childSources, error: childError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('parent_source_id', id)
        .limit(5); // Small limit to check existence

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
    } catch (error) {
      console.error('Error deleting source:', error);
      throw error;
    }
  }

  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    try {
      // Get source with all required columns
      const { data: source, error } = await supabase
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
          team_id,
          crawl_status,
          progress,
          links_count,
          parent_source_id,
          is_excluded,
          last_crawled_at,
          compressed_size,
          original_size,
          compression_ratio,
          extraction_method,
          keywords,
          content_summary,
          raw_text,
          created_by
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(`Failed to fetch source: ${error.message}`);
      
      // Get chunk count separately with timeout protection
      let chunksCount = 0;
      try {
        const { count } = await supabase
          .from('source_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('source_id', id);
        chunksCount = count || 0;
      } catch (chunkError) {
        console.warn('Failed to get chunk count, using 0:', chunkError);
      }
      
      return {
        ...source,
        metadata: source.metadata as Record<string, any> || {},
        chunks_count: chunksCount
      };
    } catch (error) {
      console.error('Error getting source with stats:', error);
      throw error;
    }
  }
}
