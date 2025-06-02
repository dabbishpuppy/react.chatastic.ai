
import { supabase } from "@/integrations/supabase/client";

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

    // Get current metadata first
    const { data: currentSource, error: fetchError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch source: ${fetchError.message}`);
    }

    const currentMetadata = currentSource?.metadata as any || {};
    const updatedMetadata = {
      ...currentMetadata,
      incremental_update: {
        enabled: true,
        frequency: frequency,
        next_update: nextUpdate.toISOString(),
        scheduled_at: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('agent_sources')
      .update({ metadata: updatedMetadata })
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to schedule update: ${error.message}`);
    }

    console.log(`✅ Scheduled ${frequency} updates for source: ${sourceId}`);
  }

  // Get sources due for update
  static async getSourcesDueForUpdate(): Promise<any[]> {
    console.log('🔍 Finding sources due for incremental update');

    const now = new Date().toISOString();

    // Since we can't use advanced jsonb queries, get all sources and filter in memory
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*');

    if (error) {
      console.error('Error fetching sources due for update:', error);
      return [];
    }

    // Filter sources due for update
    const sourcesToUpdate = (sources || []).filter(source => {
      if (!source.metadata || typeof source.metadata !== 'object') return false;
      
      const metadata = source.metadata as any;
      const incrementalUpdate = metadata.incremental_update;
      
      if (!incrementalUpdate || !incrementalUpdate.enabled) return false;
      
      const nextUpdate = incrementalUpdate.next_update;
      return nextUpdate && nextUpdate <= now;
    });

    console.log(`📊 Found ${sourcesToUpdate.length} sources due for update`);
    return sourcesToUpdate;
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
        return { success: false, changes: 0, error: 'Source not found' };
      }

      let changes = 0;
      const metadata = source.metadata as any;
      const updateMetadata = metadata?.incremental_update;

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
      const updatedMetadata = {
        ...metadata,
        incremental_update: {
          ...updateMetadata,
          last_update: new Date().toISOString(),
          next_update: nextUpdate.toISOString(),
          last_changes: changes
        }
      };

      await supabase
        .from('agent_sources')
        .update({ metadata: updatedMetadata })
        .eq('id', sourceId);

      console.log(`✅ Incremental update completed: ${changes} changes detected`);
      return { 
        success: true, 
        changes, 
        nextUpdate: nextUpdate.toISOString() 
      };

    } catch (error: any) {
      console.error('Incremental update failed:', error);
      return { success: false, changes: 0, error: error.message };
    }
  }

  private static async updateWebsiteSource(source: any): Promise<number> {
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
      const metadata = source.metadata as any;
      const oldContentHash = metadata?.content_hash;

      if (newContentHash !== oldContentHash) {
        // Content has changed, trigger reprocessing
        const updatedMetadata = {
          ...metadata,
          content_hash: newContentHash
        };

        await supabase
          .from('agent_sources')
          .update({
            crawl_status: 'pending',
            metadata: updatedMetadata
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

  private static async updateFileSource(source: any): Promise<number> {
    console.log(`📄 Checking file for changes: ${source.title}`);

    // For file sources, we can check if the file was reuploaded
    // by comparing metadata timestamps or file hashes
    const metadata = source.metadata as any;
    const lastModified = metadata?.last_modified;
    const fileModified = metadata?.file_modified || source.updated_at;

    if (lastModified && fileModified > lastModified) {
      // File has been modified, trigger reprocessing
      const updatedMetadata = {
        ...metadata,
        needs_reprocessing: true
      };

      await supabase
        .from('agent_sources')
        .update({ metadata: updatedMetadata })
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

    // Get current metadata
    const { data: source, error: fetchError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (fetchError || !source) {
      throw new Error('Source not found');
    }

    const metadata = source.metadata as any || {};
    const updatedMetadata = {
      ...metadata,
      incremental_update: {
        ...metadata.incremental_update,
        enabled: false
      }
    };

    const { error } = await supabase
      .from('agent_sources')
      .update({ metadata: updatedMetadata })
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

    const metadata = source.metadata as any;
    const updateConfig = metadata?.incremental_update;
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
