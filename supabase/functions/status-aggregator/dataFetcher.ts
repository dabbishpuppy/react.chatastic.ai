
export class DataFetcher {
  static async fetchParentSource(supabaseClient: any, parentSourceId: string) {
    console.log(`🚀 Fetching parent source: ${parentSourceId}`);
    
    // Validate parentSourceId
    if (!parentSourceId || parentSourceId === 'undefined' || parentSourceId === 'null') {
      console.error('❌ Invalid parentSourceId provided:', parentSourceId);
      throw new Error('Invalid parent source ID');
    }
    
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('crawl_status, metadata, updated_at')
      .eq('id', parentSourceId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

    if (parentError) {
      console.error('❌ Error fetching parent source:', parentError);
      throw parentError;
    }

    if (!parentSource) {
      console.error('❌ Parent source not found:', parentSourceId);
      throw new Error(`Parent source not found: ${parentSourceId}`);
    }

    console.log(`📋 Current parent state - Status: ${parentSource.crawl_status}, Metadata:`, parentSource.metadata);
    return parentSource;
  }

  static async fetchSourcePages(supabaseClient: any, parentSourceId: string) {
    console.log(`🚀 Fetching source pages for parent: ${parentSourceId}`);
    
    // Validate parentSourceId
    if (!parentSourceId || parentSourceId === 'undefined' || parentSourceId === 'null') {
      console.error('❌ Invalid parentSourceId provided for pages:', parentSourceId);
      throw new Error('Invalid parent source ID for pages fetch');
    }
    
    const { data: pages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId);

    if (pagesError) {
      console.error('❌ Error fetching source pages:', pagesError);
      throw pagesError;
    }

    // Return empty array if no pages found (this is valid)
    return pages || [];
  }
}
