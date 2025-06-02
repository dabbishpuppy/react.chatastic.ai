import { supabase } from "@/integrations/supabase/client";

export interface SourceVersion {
  id: string;
  sourceId: string;
  version: number;
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
  createdBy: string;
  changeDescription?: string;
  size: number;
}

export class SourceVersioningService {
  // Create a new version of a source
  static async createVersion(
    sourceId: string,
    content: string,
    changeDescription?: string,
    metadata?: Record<string, any>
  ): Promise<SourceVersion> {
    console.log(`📝 Creating new version for source: ${sourceId}`);

    // Get the current source to determine next version number
    const { data: source, error: sourceError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (sourceError) {
      throw new Error(`Source not found: ${sourceError.message}`);
    }

    const currentMetadata = source.metadata as any || {};
    const currentVersion = currentMetadata.current_version || 0;
    const nextVersion = currentVersion + 1;

    const versionId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const version: SourceVersion = {
      id: versionId,
      sourceId,
      version: nextVersion,
      content,
      metadata: metadata || {},
      createdAt: now,
      createdBy: 'system', // Would normally get from auth context
      changeDescription,
      size: new TextEncoder().encode(content).length
    };

    // Store version data in metadata instead of separate table
    const versions = currentMetadata.versions || [];
    versions.push(version);

    // Update source with new version info
    const updatedMetadata = {
      ...currentMetadata,
      current_version: nextVersion,
      versions: versions.slice(-10), // Keep only last 10 versions
      last_version_created: now
    };

    const { error: updateError } = await supabase
      .from('agent_sources')
      .update({
        content,
        metadata: updatedMetadata,
        updated_at: now
      })
      .eq('id', sourceId);

    if (updateError) {
      throw new Error(`Failed to create version: ${updateError.message}`);
    }

    console.log(`✅ Created version ${nextVersion} for source: ${sourceId}`);
    return version;
  }

  // Get all versions for a source
  static async getSourceVersions(sourceId: string): Promise<SourceVersion[]> {
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (error || !source) {
      console.error('Failed to get source versions:', error);
      return [];
    }

    const metadata = source.metadata as any || {};
    return metadata.versions || [];
  }

  // Get a specific version
  static async getVersion(sourceId: string, version: number): Promise<SourceVersion | null> {
    const versions = await this.getSourceVersions(sourceId);
    return versions.find(v => v.version === version) || null;
  }

  // Rollback to a previous version
  static async rollbackToVersion(
    sourceId: string, 
    targetVersion: number,
    changeDescription?: string
  ): Promise<SourceVersion> {
    console.log(`🔄 Rolling back source ${sourceId} to version ${targetVersion}`);

    const targetVersionData = await this.getVersion(sourceId, targetVersion);
    if (!targetVersionData) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // Create a new version with the rolled-back content
    return this.createVersion(
      sourceId,
      targetVersionData.content,
      changeDescription || `Rollback to version ${targetVersion}`,
      targetVersionData.metadata
    );
  }

  // Compare two versions
  static async compareVersions(
    sourceId: string, 
    version1: number, 
    version2: number
  ): Promise<{
    oldVersion: SourceVersion;
    newVersion: SourceVersion;
    changes: {
      contentChanged: boolean;
      sizeChange: number;
      metadataChanged: boolean;
    };
  }> {
    const [oldVersion, newVersion] = await Promise.all([
      this.getVersion(sourceId, version1),
      this.getVersion(sourceId, version2)
    ]);

    if (!oldVersion || !newVersion) {
      throw new Error('One or both versions not found');
    }

    const contentChanged = oldVersion.content !== newVersion.content;
    const sizeChange = newVersion.size - oldVersion.size;
    const metadataChanged = JSON.stringify(oldVersion.metadata) !== JSON.stringify(newVersion.metadata);

    return {
      oldVersion,
      newVersion,
      changes: {
        contentChanged,
        sizeChange,
        metadataChanged
      }
    };
  }

  // Auto-create version on content change
  static async autoVersionOnChange(
    sourceId: string,
    newContent: string,
    changeDescription?: string
  ): Promise<{ versionCreated: boolean; version?: SourceVersion }> {
    console.log(`🔍 Checking if auto-versioning needed for source: ${sourceId}`);

    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('content, metadata')
      .eq('id', sourceId)
      .single();

    if (error || !source) {
      return { versionCreated: false };
    }

    // Check if content has changed
    const currentContent = source.content || '';
    if (currentContent === newContent) {
      console.log('No content change detected, skipping versioning');
      return { versionCreated: false };
    }

    // Create new version
    const version = await this.createVersion(
      sourceId,
      newContent,
      changeDescription || 'Auto-version on content change'
    );

    return { versionCreated: true, version };
  }

  // Delete old versions (keep last N versions)
  static async cleanupOldVersions(sourceId: string, keepLast: number = 5): Promise<number> {
    console.log(`🧹 Cleaning up old versions for source: ${sourceId}, keeping last ${keepLast}`);

    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (error || !source) {
      return 0;
    }

    const metadata = source.metadata as any || {};
    const versions = metadata.versions || [];

    if (versions.length <= keepLast) {
      return 0;
    }

    // Keep only the last N versions
    const versionsToKeep = versions.slice(-keepLast);
    const deletedCount = versions.length - versionsToKeep.length;

    const updatedMetadata = {
      ...metadata,
      versions: versionsToKeep
    };

    const { error: updateError } = await supabase
      .from('agent_sources')
      .update({ metadata: updatedMetadata })
      .eq('id', sourceId);

    if (updateError) {
      throw new Error(`Failed to cleanup versions: ${updateError.message}`);
    }

    console.log(`✅ Cleaned up ${deletedCount} old versions`);
    return deletedCount;
  }

  // Get version history summary
  static async getVersionHistory(sourceId: string): Promise<{
    totalVersions: number;
    currentVersion: number;
    firstVersion?: SourceVersion;
    lastVersion?: SourceVersion;
    totalSizeChange: number;
  }> {
    const versions = await this.getSourceVersions(sourceId);
    
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        currentVersion: 0,
        totalSizeChange: 0
      };
    }

    const sortedVersions = versions.sort((a, b) => a.version - b.version);
    const firstVersion = sortedVersions[0];
    const lastVersion = sortedVersions[sortedVersions.length - 1];
    const totalSizeChange = lastVersion.size - firstVersion.size;

    return {
      totalVersions: versions.length,
      currentVersion: lastVersion.version,
      firstVersion,
      lastVersion,
      totalSizeChange
    };
  }
}
