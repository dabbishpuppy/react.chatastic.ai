
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";

export interface SourceOperation {
  id: string;
  type: 'bulk_update' | 'bulk_delete' | 'bulk_reprocess' | 'version_rollback';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  sourceIds: string[];
  metadata: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  progress: number;
  errorMessage?: string;
}

export class SourceOperationsSystem {
  // Bulk operations for sources
  static async bulkUpdateSources(
    sourceIds: string[],
    updates: Partial<AgentSource>
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    console.log(`🔄 Bulk updating ${sourceIds.length} sources`);
    
    const errors: string[] = [];
    let updated = 0;

    for (const sourceId of sourceIds) {
      try {
        const { error } = await supabase
          .from('agent_sources')
          .update(updates)
          .eq('id', sourceId);

        if (error) {
          errors.push(`${sourceId}: ${error.message}`);
        } else {
          updated++;
        }
      } catch (error: any) {
        errors.push(`${sourceId}: ${error.message}`);
      }
    }

    console.log(`✅ Bulk update completed: ${updated}/${sourceIds.length} successful`);
    return { success: errors.length === 0, updated, errors };
  }

  static async bulkDeleteSources(sourceIds: string[]): Promise<{ 
    success: boolean; 
    deleted: number; 
    errors: string[] 
  }> {
    console.log(`🗑️ Bulk deleting ${sourceIds.length} sources`);
    
    const errors: string[] = [];
    let deleted = 0;

    for (const sourceId of sourceIds) {
      try {
        // Delete chunks first
        const { error: chunksError } = await supabase
          .from('source_chunks')
          .delete()
          .eq('source_id', sourceId);

        if (chunksError) {
          errors.push(`${sourceId} chunks: ${chunksError.message}`);
          continue;
        }

        // Delete source
        const { error: sourceError } = await supabase
          .from('agent_sources')
          .delete()
          .eq('id', sourceId);

        if (sourceError) {
          errors.push(`${sourceId}: ${sourceError.message}`);
        } else {
          deleted++;
        }
      } catch (error: any) {
        errors.push(`${sourceId}: ${error.message}`);
      }
    }

    console.log(`✅ Bulk delete completed: ${deleted}/${sourceIds.length} successful`);
    return { success: errors.length === 0, deleted, errors };
  }

  // Source dependency tracking
  static async trackSourceDependencies(
    sourceId: string,
    dependencies: { type: string; id: string; relationship: string }[]
  ): Promise<void> {
    console.log(`🔗 Tracking dependencies for source: ${sourceId}`);

    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: supabase.raw(`
          metadata || jsonb_build_object('dependencies', $1::jsonb)
        `, [JSON.stringify(dependencies)])
      })
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to track dependencies: ${error.message}`);
    }
  }

  // Source change detection
  static async detectSourceChanges(sourceId: string): Promise<{
    hasChanged: boolean;
    changes: string[];
    lastModified?: string;
  }> {
    console.log(`🔍 Detecting changes for source: ${sourceId}`);

    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('metadata, updated_at, content')
      .eq('id', sourceId)
      .single();

    if (error || !source) {
      return { hasChanged: false, changes: [] };
    }

    const changes: string[] = [];
    const lastProcessed = source.metadata?.last_processed_at;
    
    if (!lastProcessed) {
      changes.push('Never processed');
    } else if (new Date(source.updated_at) > new Date(lastProcessed)) {
      changes.push('Content updated');
    }

    // Check if content hash has changed (if tracked)
    if (source.metadata?.content_hash) {
      const currentHash = await this.calculateContentHash(source.content || '');
      if (currentHash !== source.metadata.content_hash) {
        changes.push('Content hash changed');
      }
    }

    return {
      hasChanged: changes.length > 0,
      changes,
      lastModified: source.updated_at
    };
  }

  // Source quality metrics
  static async calculateSourceQuality(sourceId: string): Promise<{
    score: number;
    metrics: {
      completeness: number;
      readability: number;
      uniqueness: number;
      structure: number;
    };
    issues: string[];
  }> {
    console.log(`📊 Calculating quality metrics for source: ${sourceId}`);

    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('content, metadata')
      .eq('id', sourceId)
      .single();

    if (error || !source) {
      throw new Error('Source not found');
    }

    const content = source.content || '';
    const issues: string[] = [];

    // Completeness (0-1): Based on content length and metadata
    const completeness = Math.min(content.length / 1000, 1);
    if (completeness < 0.3) issues.push('Content too short');

    // Readability (0-1): Simple readability metrics
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    const readability = Math.max(0, Math.min(1, 1 - Math.abs(avgWordsPerSentence - 15) / 20));
    if (readability < 0.5) issues.push('Poor readability');

    // Uniqueness (0-1): Based on content diversity
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
    const uniqueness = Math.min(uniqueWords / (words * 0.7), 1);
    if (uniqueness < 0.4) issues.push('Low content diversity');

    // Structure (0-1): Based on formatting and organization
    const hasHeadings = /#{1,6}\s|<h[1-6]>/i.test(content);
    const hasParagraphs = content.includes('\n\n') || content.includes('<p>');
    const hasLists = /^\s*[-*+]\s|<[uo]l>/im.test(content);
    const structure = (Number(hasHeadings) + Number(hasParagraphs) + Number(hasLists)) / 3;
    if (structure < 0.3) issues.push('Poor content structure');

    const score = (completeness + readability + uniqueness + structure) / 4;

    return {
      score: Math.round(score * 100) / 100,
      metrics: {
        completeness: Math.round(completeness * 100) / 100,
        readability: Math.round(readability * 100) / 100,
        uniqueness: Math.round(uniqueness * 100) / 100,
        structure: Math.round(structure * 100) / 100
      },
      issues
    };
  }

  private static async calculateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Source validation
  static async validateSource(sourceId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log(`✅ Validating source: ${sourceId}`);

    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (error || !source) {
      return { isValid: false, errors: ['Source not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!source.title?.trim()) errors.push('Title is required');
    if (!source.source_type) errors.push('Source type is required');
    if (!source.agent_id) errors.push('Agent ID is required');

    // Content validation
    if (source.source_type !== 'website' && (!source.content || source.content.length < 10)) {
      errors.push('Content is too short or missing');
    }

    // URL validation for website sources
    if (source.source_type === 'website' && source.url) {
      try {
        new URL(source.url);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    // Metadata validation
    if (source.metadata && typeof source.metadata !== 'object') {
      warnings.push('Metadata should be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
