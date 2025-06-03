
import { supabase } from "@/integrations/supabase/client";

export class MetadataUpdater {
  static async updateSourceMetadataForSkipped(sourceId: string, metadata: any): Promise<void> {
    const updatedMetadata = {
      ...metadata,
      chunks_count: 0,
      last_processed_at: new Date().toISOString(),
      processing_status: 'completed',
      processing_note: 'No content to process'
    };

    await supabase
      .from('agent_sources')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', sourceId);
  }

  static async updateSourceMetadataForSuccess(
    sourceId: string, 
    metadata: any, 
    chunks: any[], 
    sourceType: string, 
    contentLength: number
  ): Promise<void> {
    const updatedMetadata = {
      ...metadata,
      chunks_count: chunks.length,
      last_processed_at: new Date().toISOString(),
      processing_status: 'completed',
      source_type_processed: sourceType,
      embeddings_generated: chunks.length > 0,
      processing_note: chunks.length > 0 ? 'Successfully processed with chunks and embeddings' : 'Processed but no chunks created',
      content_length: contentLength,
      chunking_strategy: sourceType === 'qa' && chunks.some(c => (c.metadata as any)?.isForceCreated) ? 'force_created' : 'standard'
    };

    await supabase
      .from('agent_sources')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', sourceId);
  }

  static async updateSourceMetadataForFailure(
    sourceId: string, 
    metadata: any, 
    sourceType: string, 
    error: any
  ): Promise<void> {
    const updatedMetadata = {
      ...metadata,
      last_processed_at: new Date().toISOString(),
      processing_status: 'failed',
      processing_error: error instanceof Error ? error.message : 'Unknown error',
      source_type_processed: sourceType
    };

    await supabase
      .from('agent_sources')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', sourceId);
  }
}
