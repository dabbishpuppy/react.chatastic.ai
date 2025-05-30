
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
      const { data: childSources, error: childError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('parent_source_id', id)
        .limit(5);

      if (childError) throw new Error(`Failed to check child sources: ${childError.message}`);

      if (childSources && childSources.length > 0) {
        const { error: deleteChildrenError } = await supabase
          .from('agent_sources')
          .delete()
          .eq('parent_source_id', id);

        if (deleteChildrenError) throw new Error(`Failed to delete child sources: ${deleteChildrenError.message}`);
      }

      const { error } = await supabase
        .from('agent_sources')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Failed to delete source: ${error.message}`);
      return true;
    } catch (error) {
      console.error('Error deleting source:', error);
      throw error;
    }
  }
}
