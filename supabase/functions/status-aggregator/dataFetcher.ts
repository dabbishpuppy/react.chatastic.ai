
export class DataFetcher {
  static async fetchParentSource(supabaseClient: any, parentSourceId: string) {
    console.log(`🚀 Fetching parent source: ${parentSourceId}`);
    
    // Enhanced validation for parentSourceId
    if (!parentSourceId || 
        parentSourceId === 'undefined' || 
        parentSourceId === 'null' || 
        parentSourceId.trim() === '' ||
        parentSourceId === 'Invalid') {
      console.error('❌ Invalid parentSourceId provided:', parentSourceId);
      throw new Error(`Invalid parent source ID: ${parentSourceId}`);
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(parentSourceId)) {
      console.error('❌ Invalid UUID format for parentSourceId:', parentSourceId);
      throw new Error(`Invalid UUID format for parent source ID: ${parentSourceId}`);
    }
    
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('crawl_status, metadata, updated_at')
      .eq('id', parentSourceId)
      .maybeSingle();

    if (parentError) {
      console.error('❌ Database error fetching parent source:', parentError);
      throw new Error(`Database error: ${parentError.message}`);
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
    
    // Enhanced validation for parentSourceId
    if (!parentSourceId || 
        parentSourceId === 'undefined' || 
        parentSourceId === 'null' || 
        parentSourceId.trim() === '') {
      console.error('❌ Invalid parentSourceId provided for pages:', parentSourceId);
      throw new Error(`Invalid parent source ID for pages fetch: ${parentSourceId}`);
    }
    
    const { data: pages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId);

    if (pagesError) {
      console.error('❌ Error fetching source pages:', pagesError);
      throw new Error(`Pages fetch error: ${pagesError.message}`);
    }

    // Return empty array if no pages found (this is valid)
    const pageCount = pages?.length || 0;
    console.log(`📄 Found ${pageCount} source pages for parent: ${parentSourceId}`);
    
    return pages || [];
  }
}
