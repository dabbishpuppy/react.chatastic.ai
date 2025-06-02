
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceType } from "@/types/rag";
import { BaseSourceService } from "../base/BaseSourceService";

export class SourceCreateService extends BaseSourceService {
  static async createSource(data: {
    agent_id: string;
    team_id: string;
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
    exclude_paths?: string[];
    include_paths?: string[];
    respect_robots?: boolean;
    max_concurrent_jobs?: number;
    discovery_completed?: boolean;
  }): Promise<AgentSource> {
    console.log(`🔄 Creating ${data.source_type} source for agent: ${data.agent_id}`);
    
    // Get team_id from agent if not provided
    let teamId = data.team_id;
    if (!teamId) {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', data.agent_id)
        .single();
        
      if (agentError || !agent) {
        throw new Error(`Failed to get agent team: ${agentError?.message || 'Agent not found'}`);
      }
      
      teamId = agent.team_id;
    }

    const sourceData = {
      agent_id: data.agent_id,
      team_id: teamId,
      source_type: data.source_type,
      title: data.title,
      content: data.content || null,
      metadata: data.metadata || {},
      file_path: data.file_path || null,
      url: data.url || null,
      crawl_status: data.crawl_status || (data.source_type === 'website' ? 'pending' : null),
      progress: data.progress || 0,
      links_count: data.links_count || 0,
      parent_source_id: data.parent_source_id || null,
      is_excluded: data.is_excluded || false,
      exclude_paths: data.exclude_paths || [],
      include_paths: data.include_paths || [],
      respect_robots: data.respect_robots !== undefined ? data.respect_robots : true,
      max_concurrent_jobs: data.max_concurrent_jobs || 5,
      discovery_completed: data.discovery_completed || false,
      is_active: true
    };

    const { data: source, error } = await supabase
      .from('agent_sources')
      .insert(sourceData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error creating source:', error);
      throw new Error(`Failed to create source: ${error.message}`);
    }

    if (!source) {
      throw new Error('No source returned from database');
    }

    console.log(`✅ Created ${data.source_type} source: ${source.id}`);
    return this.formatSource(source);
  }
}
