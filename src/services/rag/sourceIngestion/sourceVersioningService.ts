import { supabase } from "@/integrations/supabase/client";

export interface SourceVersion {
  id: string;
  sourceId: string;
  version: number;
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
  createdBy?: string;
  isActive: boolean;
  changeReason?: string;
  contentHash: string;
}

export class SourceVersioningService {
  // Create a new version when source content changes
  static async createVersion(
    sourceId: string,
    content: string,
    metadata: Record<string, any> = {},
    changeReason?: string
  ): Promise<SourceVersion> {
    console.log(`📝 Creating new version for source: ${sourceId}`);

    // Get current max version
    const { data: maxVersionData, error: versionError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (versionError) {
      throw new Error(`Failed to get source: ${versionError.message}`);
    }

    const currentVersion = maxVersionData?.metadata?.current_version || 0;
    const nextVersion = currentVersion + 1;

    // Calculate content hash
    const contentHash = await this.calculateContentHash(content);

    // Store version in metadata (since we don't have a separate versions table)
    const versionData: SourceVersion = {
      id: `${sourceId}_v${nextVersion}`,
      sourceId,
      version: nextVersion,
      content,
      metadata,
      createdAt: new Date().toISOString(),
      isActive: true,
      changeReason,
      contentHash
    };

    // Update source with new version
    const { error: updateError } = await supabase
      .from('agent_sources')
      .update({
        content,
        metadata: supabase.raw(`
          metadata || jsonb_build_object(
            'current_version', $1,
            'versions', COALESCE(metadata->'versions', '[]'::jsonb) || $2::jsonb,
            'content_hash', $3
          )
        `, [nextVersion, JSON.stringify([versionData]), contentHash])
      })
      .eq('id', sourceId);

    if (updateError) {
      throw new Error(`Failed to create version: ${updateError.message}`);
    }

    console.log(`✅ Created version ${nextVersion} for source: ${sourceId}`);
    return versionData;
  }

  // Get all versions for a source
  static async getVersions(sourceId: string): Promise<SourceVersion[]> {
    console.log(`📚 Getting versions for source: ${sourceId}`);

    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (error) {
      throw new Error(`Failed to get source: ${error.message}`);
    }

    const versions = source?.metadata?.versions || [];
    return versions.sort((a: SourceVersion, b: SourceVersion) => b.version - a.version);
  }

  // Get a specific version
  static async getVersion(sourceId: string, version: number): Promise<SourceVersion | null> {
    console.log(`🔍 Getting version ${version} for source: ${sourceId}`);

    const versions = await this.getVersions(sourceId);
    return versions.find(v => v.version === version) || null;
  }

  // Rollback to a previous version
  static async rollbackToVersion(
    sourceId: string, 
    targetVersion: number,
    reason?: string
  ): Promise<SourceVersion> {
    console.log(`⏪ Rolling back source ${sourceId} to version ${targetVersion}`);

    const targetVersionData = await this.getVersion(sourceId, targetVersion);
    if (!targetVersionData) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // Create a new version with the rollback content
    const rollbackVersion = await this.createVersion(
      sourceId,
      targetVersionData.content,
      {
        ...targetVersionData.metadata,
        rollback_from_version: targetVersion,
        rollback_reason: reason
      },
      `Rollback to version ${targetVersion}${reason ? `: ${reason}` : ''}`
    );

    // Trigger reprocessing of chunks
    await this.triggerReprocessing(sourceId);

    console.log(`✅ Rolled back to version ${targetVersion}, created new version ${rollbackVersion.version}`);
    return rollbackVersion;
  }

  // Compare two versions
  static async compareVersions(
    sourceId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: SourceVersion;
    version2: SourceVersion;
    differences: {
      contentChanged: boolean;
      metadataChanged: boolean;
      changeSummary: string[];
    };
  }> {
    console.log(`🔄 Comparing versions ${version1} and ${version2} for source: ${sourceId}`);

    const [v1, v2] = await Promise.all([
      this.getVersion(sourceId, version1),
      this.getVersion(sourceId, version2)
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const contentChanged = v1.contentHash !== v2.contentHash;
    const metadataChanged = JSON.stringify(v1.metadata) !== JSON.stringify(v2.metadata);
    
    const changeSummary: string[] = [];
    if (contentChanged) changeSummary.push('Content modified');
    if (metadataChanged) changeSummary.push('Metadata updated');

    // Basic content difference analysis
    if (contentChanged) {
      const lengthDiff = v2.content.length - v1.content.length;
      if (lengthDiff > 0) changeSummary.push(`+${lengthDiff} characters`);
      else if (lengthDiff < 0) changeSummary.push(`${lengthDiff} characters`);
    }

    return {
      version1: v1,
      version2: v2,
      differences: {
        contentChanged,
        metadataChanged,
        changeSummary
      }
    };
  }

  // Clean up old versions (keep only recent versions)
  static async cleanupOldVersions(
    sourceId: string,
    keepVersions: number = 10
  ): Promise<number> {
    console.log(`🧹 Cleaning up old versions for source: ${sourceId}, keeping ${keepVersions}`);

    const versions = await this.getVersions(sourceId);
    
    if (versions.length <= keepVersions) {
      console.log('No cleanup needed');
      return 0;
    }

    const versionsToKeep = versions.slice(0, keepVersions);
    const cleanedCount = versions.length - keepVersions;

    // Update source to keep only recent versions
    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: supabase.raw(`
          metadata || jsonb_build_object('versions', $1::jsonb)
        `, [JSON.stringify(versionsToKeep)])
      })
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to cleanup versions: ${error.message}`);
    }

    console.log(`✅ Cleaned up ${cleanedCount} old versions`);
    return cleanedCount;
  }

  private static async calculateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static async triggerReprocessing(sourceId: string): Promise<void> {
    console.log(`🔄 Triggering reprocessing for source: ${sourceId}`);

    // Delete existing chunks to force reprocessing
    const { error: deleteError } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId);

    if (deleteError) {
      console.error('Failed to delete chunks:', deleteError);
    }

    // Mark source for reprocessing
    const { error: updateError } = await supabase
      .from('agent_sources')
      .update({
        metadata: supabase.raw(`
          metadata || jsonb_build_object('needs_reprocessing', true)
        `)
      })
      .eq('id', sourceId);

    if (updateError) {
      console.error('Failed to mark for reprocessing:', updateError);
    }
  }

  // Get version history summary
  static async getVersionHistory(sourceId: string): Promise<{
    totalVersions: number;
    currentVersion: number;
    recentChanges: Array<{
      version: number;
      createdAt: string;
      changeReason?: string;
      contentLength: number;
    }>;
  }> {
    const versions = await this.getVersions(sourceId);
    
    return {
      totalVersions: versions.length,
      currentVersion: versions[0]?.version || 0,
      recentChanges: versions.slice(0, 5).map(v => ({
        version: v.version,
        createdAt: v.createdAt,
        changeReason: v.changeReason,
        contentLength: v.content.length
      }))
    };
  }
}
