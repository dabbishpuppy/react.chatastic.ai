
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";

export class BaseSourceService {
  protected static async getAgentTeamId(agentId: string): Promise<string> {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('team_id')
      .eq('id', agentId)
      .single();

    if (error) throw new Error(`Failed to fetch agent: ${error.message}`);
    if (!agent) throw new Error('Agent not found');

    return agent.team_id;
  }

  protected static formatSource(source: any): AgentSource {
    return {
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    };
  }

  protected static formatSources(sources: any[]): AgentSource[] {
    return (sources || []).map(source => this.formatSource(source));
  }
}
