
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceType } from "@/types/rag";
import { BaseSourceService } from "../base/BaseSourceService";

export class SourceQueryService extends BaseSourceService {
  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    try {
      console.log(`🔍 Fetching ALL sources for agent: ${agentId}`);
      
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        // Removed the .limit(50) to fetch all sources

      if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
      
      console.log(`✅ Fetched ${sources?.length || 0} sources for agent ${agentId}`);
      return this.formatSources(sources || []);
    } catch (error) {
      console.error('Error fetching sources by agent:', error);
      throw error;
    }
  }

  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('agent_id', agentId)
        .eq('source_type', sourceType)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        // No limit here either for consistency

      if (error) throw new Error(`Failed to fetch ${sourceType} sources: ${error.message}`);
      return this.formatSources(sources || []);
    } catch (error) {
      console.error(`Error fetching ${sourceType} sources:`, error);
      throw error;
    }
  }

  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    try {
      const { data: source, error: sourceError } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('id', id)
        .single();

      if (sourceError) throw new Error(`Failed to fetch source: ${sourceError.message}`);
      if (!source) throw new Error('Source not found');

      const { count: chunksCount, error: chunksError } = await supabase
        .from('source_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('source_id', id);

      if (chunksError) throw new Error(`Failed to fetch chunks count: ${chunksError.message}`);

      return {
        ...this.formatSource(source),
        chunks_count: chunksCount || 0
      };
    } catch (error) {
      console.error('Error fetching source with stats:', error);
      throw error;
    }
  }
}
