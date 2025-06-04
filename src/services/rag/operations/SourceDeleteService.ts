
import { supabase } from "@/integrations/supabase/client";
import { BaseSourceService } from "../base/BaseSourceService";

export class SourceDeleteService extends BaseSourceService {
  static async deactivateSource(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_sources')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw new Error(`Failed to deactivate source: ${error.message}`);
      return true;
    } catch (error) {
      console.error('Error deactivating source:', error);
      throw error;
    }
  }

  static async deleteSource(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Starting comprehensive deletion of source: ${id}`);

      // Get source info before deletion for event dispatch
      const { data: sourceInfo, error: sourceInfoError } = await supabase
        .from('agent_sources')
        .select('agent_id, source_type')
        .eq('id', id)
        .single();

      if (sourceInfoError) {
        console.warn(`Warning: Could not get source info: ${sourceInfoError.message}`);
      }

      // Check if this is a parent source (has children)
      const { data: childSources, error: childError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('parent_source_id', id)
        .limit(5);

      if (childError) throw new Error(`Failed to check child sources: ${childError.message}`);

      // Step 1: Get all chunk IDs for this source (for embedding cleanup)
      console.log(`📋 Getting chunks for source: ${id}`);
      const { data: chunks, error: chunksQueryError } = await supabase
        .from('source_chunks')
        .select('id')
        .eq('source_id', id);

      if (chunksQueryError) {
        console.warn(`Warning: Failed to query chunks: ${chunksQueryError.message}`);
      }

      const chunkIds = chunks?.map(chunk => chunk.id) || [];
      console.log(`📄 Found ${chunkIds.length} chunks to delete`);

      // Step 2: Delete source embeddings for all chunks
      if (chunkIds.length > 0) {
        console.log(`🔗 Deleting embeddings for ${chunkIds.length} chunks`);
        const { error: embeddingsError } = await supabase
          .from('source_embeddings')
          .delete()
          .in('chunk_id', chunkIds);

        if (embeddingsError) {
          console.warn(`Warning: Failed to delete embeddings: ${embeddingsError.message}`);
        } else {
          console.log(`✅ Successfully deleted embeddings for source: ${id}`);
        }
      }

      // Step 3: Delete all source chunks
      console.log(`📝 Deleting chunks for source: ${id}`);
      const { error: chunksError } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', id);

      if (chunksError) {
        console.warn(`Warning: Failed to delete chunks: ${chunksError.message}`);
      } else {
        console.log(`✅ Successfully deleted chunks for source: ${id}`);
      }

      // Step 4: Delete all source pages (child pages of this parent source)
      console.log(`📃 Deleting source pages for parent: ${id}`);
      const { error: pagesError } = await supabase
        .from('source_pages')
        .delete()
        .eq('parent_source_id', id);

      if (pagesError) {
        console.warn(`Warning: Failed to delete source pages: ${pagesError.message}`);
      } else {
        console.log(`✅ Successfully deleted source pages for parent: ${id}`);
      }

      // Step 5: Delete all crawl jobs for this parent source
      console.log(`⚙️ Deleting crawl jobs for parent: ${id}`);
      const { error: crawlJobsError } = await supabase
        .from('crawl_jobs')
        .delete()
        .eq('parent_source_id', id);

      if (crawlJobsError) {
        console.warn(`Warning: Failed to delete crawl jobs: ${crawlJobsError.message}`);
      } else {
        console.log(`✅ Successfully deleted crawl jobs for parent: ${id}`);
      }

      // Step 6: Delete child agent sources
      if (childSources && childSources.length > 0) {
        console.log(`👥 Deleting ${childSources.length} child sources`);
        const { error: deleteChildrenError } = await supabase
          .from('agent_sources')
          .delete()
          .eq('parent_source_id', id);

        if (deleteChildrenError) {
          console.warn(`Warning: Failed to delete child sources: ${deleteChildrenError.message}`);
        } else {
          console.log(`✅ Successfully deleted child sources for parent: ${id}`);
        }
      }

      // Step 7: Finally delete the parent source
      console.log(`🎯 Deleting parent source: ${id}`);
      const { error: parentError } = await supabase
        .from('agent_sources')
        .delete()
        .eq('id', id);

      if (parentError) throw new Error(`Failed to delete parent source: ${parentError.message}`);

      console.log(`🎉 Successfully completed comprehensive deletion of source: ${id}`);
      console.log(`📊 Deletion summary:
        - Chunks: ${chunkIds.length}
        - Embeddings: ${chunkIds.length}
        - Source pages: Deleted for parent ${id}
        - Crawl jobs: Deleted for parent ${id}
        - Child sources: ${childSources?.length || 0}
        - Parent source: 1`);

      // Trigger a custom event to notify other components about the deletion
      if (sourceInfo?.agent_id) {
        window.dispatchEvent(new CustomEvent('sourceDeleted', {
          detail: { 
            sourceId: id, 
            agentId: sourceInfo.agent_id,
            sourceType: sourceInfo.source_type 
          }
        }));
        console.log('📡 Dispatched sourceDeleted event for real-time UI update');
      }

      return true;
    } catch (error) {
      console.error('❌ Error during comprehensive source deletion:', error);
      throw error;
    }
  }
}
