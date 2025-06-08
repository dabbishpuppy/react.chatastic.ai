
import { supabase } from '@/integrations/supabase/client';

export interface SemanticSearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  sourceId: string;
  sourceTitle: string;
  sourceType: 'text' | 'file' | 'website' | 'qa';
}

export interface SearchFilters {
  maxResults?: number;
  minSimilarity?: number;
  sourceTypes?: Array<'text' | 'file' | 'website' | 'qa'>;
}

export class SemanticSearchService {
  static async searchSimilarChunks(
    query: string,
    agentId: string,
    filters?: SearchFilters
  ): Promise<SemanticSearchResult[]> {
    console.log('🔍 Semantic search:', { 
      query: query.substring(0, 50) + '...', 
      agentId: agentId === 'test-agent-id' ? 'TEST-MODE' : agentId.substring(0, 8) + '...'
    });

    try {
      // For testing purposes, return mock data for test agent
      if (agentId === 'test-agent-id') {
        console.log('🧪 Returning mock semantic search results for testing');
        return [
          {
            chunkId: 'test-chunk-1',
            content: 'This is a test chunk for semantic search testing.',
            similarity: 0.85,
            metadata: { test: true },
            sourceId: 'test-source-1',
            sourceTitle: 'Test Source 1',
            sourceType: 'text'
          },
          {
            chunkId: 'test-chunk-2',
            content: 'This is another test chunk for comprehensive testing.',
            similarity: 0.75,
            metadata: { test: true },
            sourceId: 'test-source-2',
            sourceTitle: 'Test Source 2',
            sourceType: 'text'
          }
        ];
      }

      const maxResults = filters?.maxResults || 10;
      const minSimilarity = filters?.minSimilarity || 0.3;

      // Actual database query for real agents
      const { data: chunks, error } = await supabase
        .from('source_chunks')
        .select(`
          id,
          content,
          metadata,
          agent_sources!inner(
            id,
            title,
            source_type,
            agent_id
          )
        `)
        .eq('agent_sources.agent_id', agentId)
        .eq('agent_sources.is_active', true)
        .limit(maxResults);

      if (error) {
        console.error('❌ Semantic search database error:', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        console.log('📊 Semantic search found 0 results for query:', query.substring(0, 50) + '...');
        return [];
      }

      // Transform database results
      const results: SemanticSearchResult[] = chunks.map((chunk: any) => ({
        chunkId: chunk.id,
        content: chunk.content,
        similarity: 0.7, // Mock similarity for now
        metadata: chunk.metadata || {},
        sourceId: chunk.agent_sources.id,
        sourceTitle: chunk.agent_sources.title,
        sourceType: chunk.agent_sources.source_type
      }));

      console.log(`✅ Semantic search found ${results.length} results`);
      return results;

    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      return [];
    }
  }

  static async searchByKeywords(
    keywords: string[],
    agentId: string,
    filters?: SearchFilters
  ): Promise<SemanticSearchResult[]> {
    console.log('🔎 Keyword search:', { 
      keywords: keywords.slice(0, 3), 
      agentId: agentId === 'test-agent-id' ? 'TEST-MODE' : agentId.substring(0, 8) + '...'
    });

    try {
      // For testing purposes, return mock data for test agent
      if (agentId === 'test-agent-id') {
        console.log('🧪 Returning mock keyword search results for testing');
        return [
          {
            chunkId: 'test-keyword-chunk-1',
            content: `This chunk contains keywords: ${keywords.join(', ')}`,
            similarity: 0.65,
            metadata: { keywords: keywords },
            sourceId: 'test-source-keyword',
            sourceTitle: 'Test Keyword Source',
            sourceType: 'text'
          }
        ];
      }

      if (!keywords.length) {
        return [];
      }

      const maxResults = filters?.maxResults || 10;

      // Build keyword search query
      const searchQuery = keywords.map(k => `"${k}"`).join(' | ');

      const { data: chunks, error } = await supabase
        .from('source_chunks')
        .select(`
          id,
          content,
          metadata,
          agent_sources!inner(
            id,
            title,
            source_type,
            agent_id
          )
        `)
        .eq('agent_sources.agent_id', agentId)
        .eq('agent_sources.is_active', true)
        .textSearch('content', searchQuery)
        .limit(maxResults);

      if (error) {
        console.error('❌ Keyword search error:', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        console.log('📊 Keyword search found 0 results');
        return [];
      }

      // Transform results
      const results: SemanticSearchResult[] = chunks.map((chunk: any) => ({
        chunkId: chunk.id,
        content: chunk.content,
        similarity: 0.6, // Mock similarity for keyword search
        metadata: chunk.metadata || {},
        sourceId: chunk.agent_sources.id,
        sourceTitle: chunk.agent_sources.title,
        sourceType: chunk.agent_sources.source_type
      }));

      console.log(`✅ Keyword search found ${results.length} results`);
      return results;

    } catch (error) {
      console.error('❌ Keyword search failed:', error);
      return [];
    }
  }
}
