
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";

export interface UpdateSchedule {
  sourceId: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  nextUpdate: string;
  lastUpdate?: string;
  enabled: boolean;
}

export class IncrementalUpdateService {
  // Schedule incremental updates
  static async scheduleIncrementalUpdate(
    sourceId: string,
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    console.log(`📅 Scheduling incremental update for source: ${sourceId}`);

    const nextUpdate = this.calculateNextUpdate(frequency);

    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: supabase.raw(`
          metadata || jsonb_build_object(
            'incremental_update', jsonb_build_object(
              'enabled', true,
              'frequency', $1,
              'next_update', $2,
              'scheduled_at', $3
            )
          )
        `, [frequency, nextUpdate.toISOString(), new Date().toISOString()])
      })
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to schedule update: ${error.message}`);
    }

    console.log(`✅ Scheduled ${frequency} updates for source: ${sourceId}`);
  }

  // Get sources due for update
  static async getSourcesDueForUpdate(): Promise<AgentSource[]> {
    console.log('🔍 Finding sources due for incremental update');

    const now = new Date().toISOString();

    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*')
      .lte("metadata->incremental_update->next_update", now)
      .eq("metadata->incremental_update->enabled", true);

    if (error) {
      console.error('Error fetching sources due for update:', error);
      return [];
    }

    console.log(`📊 Found ${sources?.length || 0} sources due for update`);
    return sources || [];
  }

  // Process incremental update
  static async processIncrementalUpdate(sourceId: string): Promise<{
    success: boolean;
    changes: number;
    nextUpdate?: string;
    error?: string;
  }> {
    console.log(`🔄 Processing incremental update for source: ${sourceId}`);

    try {
      const { data: source, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error || !source) {
        return { success: false, error: 'Source not found' };
      }

      let changes = 0;
      const updateMetadata = source.metadata?.incremental_update;

      // Process based on source type
      switch (source.source_type) {
        case 'website':
          changes = await this.updateWebsiteSource(source);
          break;
        case 'file':
          changes = await this.updateFileSource(source);
          break;
        default:
          console.log(`Incremental updates not supported for type: ${source.source_type}`);
          break;
      }

      // Calculate next update time
      const frequency = updateMetadata?.frequency || 'daily';
      const nextUpdate = this.calculateNextUpdate(frequency);

      // Update metadata
      await supabase
        .from('agent_sources')
        .update({
          metadata: supabase.raw(`
            metadata || jsonb_build_object(
              'incremental_update', 
              (metadata->'incremental_update') || jsonb_build_object(
                'last_update', $1,
                'next_update', $2,
                'last_changes', $3
              )
            )
          `, [new Date().toISOString(), nextUpdate.toISOString(), changes])
        })
        .eq('id', sourceId);

      console.log(`✅ Incremental update completed: ${changes} changes detected`);
      return { 
        success: true, 
        changes, 
        nextUpdate: nextUpdate.toISOString() 
      };

    } catch (error: any) {
      console.error('Incremental update failed:', error);
      return { success: false, error: error.message };
    }
  }

  private static async updateWebsiteSource(source: AgentSource): Promise<number> {
    console.log(`🌐 Checking website for changes: ${source.url}`);

    if (!source.url) return 0;

    try {
      // Simple content change detection
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'WonderWave-Bot/2.0' }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${source.url}: ${response.status}`);
        return 0;
      }

      const newContent = await response.text();
      const newContentHash = await this.calculateContentHash(newContent);
      const oldContentHash = source.metadata?.content_hash;

      if (newContentHash !== oldContentHash) {
        // Content has changed, trigger reprocessing
        await supabase
          .from('agent_sources')
          .update({
            crawl_status: 'pending',
            metadata: supabase.raw(`
              metadata || jsonb_build_object('content_hash', $1)
            `, [newContentHash])
          })
          .eq('id', source.id);

        return 1;
      }

      return 0;
    } catch (error) {
      console.error('Error updating website source:', error);
      return 0;
    }
  }

  private static async updateFileSource(source: AgentSource): Promise<number> {
    console.log(`📄 Checking file for changes: ${source.title}`);

    // For file sources, we can check if the file was reuploaded
    // by comparing metadata timestamps or file hashes
    const lastModified = source.metadata?.last_modified;
    const fileModified = source.metadata?.file_modified || source.updated_at;

    if (lastModified && fileModified > lastModified) {
      // File has been modified, trigger reprocessing
      await supabase
        .from('agent_sources')
        .update({
          metadata: supabase.raw(`
            metadata || jsonb_build_object('needs_reprocessing', true)
          `)
        })
        .eq('id', source.id);

      return 1;
    }

    return 0;
  }

  private static calculateNextUpdate(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private static async calculateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Disable incremental updates
  static async disableIncrementalUpdate(sourceId: string): Promise<void> {
    console.log(`⏹️ Disabling incremental updates for source: ${sourceId}`);

    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: supabase.raw(`
          metadata || jsonb_build_object(
            'incremental_update', 
            (metadata->'incremental_update') || jsonb_build_object('enabled', false)
          )
        `)
      })
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to disable updates: ${error.message}`);
    }
  }

  // Get update schedule for a source
  static async getUpdateSchedule(sourceId: string): Promise<UpdateSchedule | null> {
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (error || !source) return null;

    const updateConfig = source.metadata?.incremental_update;
    if (!updateConfig) return null;

    return {
      sourceId,
      frequency: updateConfig.frequency || 'daily',
      nextUpdate: updateConfig.next_update,
      lastUpdate: updateConfig.last_update,
      enabled: updateConfig.enabled || false
    };
  }
}
