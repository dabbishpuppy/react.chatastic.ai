
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceType } from "@/types/rag";
import { BaseSourceService } from "../base/BaseSourceService";

export class SourceQueryService extends BaseSourceService {
  private static readonly SOURCE_FIELDS = `
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
  `;

  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    const startTime = Date.now();
    try {
      console.log(`🚀 Starting fetch for agent: ${agentId}`);
      
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select(this.SOURCE_FIELDS)
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      const endTime = Date.now();
      console.log(`⏱️ Query completed in ${endTime - startTime}ms`);

      if (error) {
        console.error('❌ Database error fetching sources:', error);
        return [];
      }

      const resultCount = sources?.length || 0;
      console.log(`✅ Successfully fetched ${resultCount} sources in ${endTime - startTime}ms`);
      
      return this.formatSources(sources);
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Error in getSourcesByAgent after ${endTime - startTime}ms:`, error);
      return [];
    }
  }

  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    const startTime = Date.now();
    try {
      console.log(`🚀 Starting fetch for ${sourceType} sources, agent: ${agentId}`);
      
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select(this.SOURCE_FIELDS)
        .eq('agent_id', agentId)
        .eq('source_type', sourceType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(30);

      const endTime = Date.now();
      console.log(`⏱️ Type-specific query completed in ${endTime - startTime}ms`);

      if (error) {
        console.error(`❌ Database error fetching ${sourceType} sources:`, error);
        return [];
      }

      const resultCount = sources?.length || 0;
      console.log(`✅ Successfully fetched ${resultCount} ${sourceType} sources in ${endTime - startTime}ms`);
      
      return this.formatSources(sources);
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Error in getSourcesByType for ${sourceType} after ${endTime - startTime}ms:`, error);
      return [];
    }
  }

  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    try {
      const { data: source, error } = await supabase
        .from('agent_sources')
        .select(this.SOURCE_FIELDS)
        .eq('id', id)
        .single();

      if (error) throw new Error(`Failed to fetch source: ${error.message}`);
      
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
        ...this.formatSource(source),
        chunks_count: chunksCount
      };
    } catch (error) {
      console.error('Error getting source with stats:', error);
      throw error;
    }
  }
}
