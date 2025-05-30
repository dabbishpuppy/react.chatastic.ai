
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceType } from "@/types/rag";
import { BaseSourceService } from "../base/BaseSourceService";

export class SourceCreateService extends BaseSourceService {
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
      const team_id = await this.getAgentTeamId(data.agent_id);

      const sourceData = {
        ...data,
        team_id
        // Note: created_by and created_at will be automatically set by the database triggers
      };

      const { data: source, error } = await supabase
        .from('agent_sources')
        .insert(sourceData)
        .select()
        .single();

      if (error) throw new Error(`Failed to create source: ${error.message}`);
      return this.formatSource(source);
    } catch (error) {
      console.error('Error creating source:', error);
      throw error;
    }
  }
}
