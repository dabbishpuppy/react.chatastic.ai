
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";
import { BaseSourceService } from "../base/BaseSourceService";

export class SourceUpdateService extends BaseSourceService {
  static async updateSource(id: string, updates: Partial<AgentSource & {
    crawl_status?: string;
    progress?: number;
    links_count?: number;
    is_excluded?: boolean;
    last_crawled_at?: string;
  }>): Promise<AgentSource> {
    try {
      // If this is a completion update for a parent source, calculate total content size
      if (updates.crawl_status === 'completed' && updates.links_count !== undefined) {
        const { data: childSources, error: childError } = await supabase
          .from('agent_sources')
          .select('content, metadata')
          .eq('parent_source_id', id)
          .eq('is_active', true);

        if (!childError && childSources && childSources.length > 0) {
          const totalContentSize = childSources.reduce((total, child) => {
            let childSize = 0;
            
            if (child.content) {
              childSize += new Blob([child.content]).size;
            }
            
            const metadata = child.metadata as Record<string, any> | null;
            if (metadata && typeof metadata.content_size === 'number') {
              childSize += metadata.content_size;
            }
            
            return total + childSize;
          }, 0);

          updates.metadata = {
            ...(updates.metadata || {}),
            total_content_size: totalContentSize,
            last_size_update: new Date().toISOString()
          };
        }
      }

      // Note: updated_by and updated_at will be automatically set by the database triggers
      const { data: source, error } = await supabase
        .from('agent_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update source: ${error.message}`);
      return this.formatSource(source);
    } catch (error) {
      console.error('Error updating source:', error);
      throw error;
    }
  }
}
