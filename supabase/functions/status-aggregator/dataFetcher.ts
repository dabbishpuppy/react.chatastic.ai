
export class DataFetcher {
  static async fetchParentSource(supabaseClient: any, parentSourceId: string) {
    console.log(`🚀 Fetching parent source: ${parentSourceId}`);
    
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('crawl_status, metadata, updated_at')
      .eq('id', parentSourceId)
      .single();

    if (parentError) {
      console.error('❌ Error fetching parent source:', parentError);
      throw parentError;
    }

    console.log(`📋 Current parent state - Status: ${parentSource.crawl_status}, Metadata:`, parentSource.metadata);
    return parentSource;
  }

  static async fetchSourcePages(supabaseClient: any, parentSourceId: string) {
    console.log(`🚀 Fetching source pages for parent: ${parentSourceId}`);
    
    const { data: pages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId);

    if (pagesError) {
      console.error('❌ Error fetching source pages:', pagesError);
      throw pagesError;
    }

    return pages;
  }
}
