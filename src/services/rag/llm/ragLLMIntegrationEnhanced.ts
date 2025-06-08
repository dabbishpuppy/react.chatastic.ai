import { LLMRouter } from './llmRouter';
import { RAGQueryOptions, RAGQueryResult } from './llmTypes';
import { VectorStore } from '../vectorstore/vectorStore';
import { Metadata } from '../vectorstore/vectorStoreTypes';
import { OpenAI } from 'openai';
import { getMatchesFromEmbeddings } from '../utils';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { supabase } from '@/integrations/supabase/client';
import { Embeddings } from 'langchain/embeddings/base';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'langchain/document';
import { UsageTracker } from '../costMonitoring/usageTracker';

export class EnhancedRAGLLMIntegration {
  private llmRouter: LLMRouter;
  private vectorStore: VectorStore;
  private embeddings: Embeddings;

  constructor(llmRouter: LLMRouter, vectorStore: VectorStore, embeddings?: Embeddings) {
    this.llmRouter = llmRouter;
    this.vectorStore = vectorStore;
    this.embeddings = embeddings || new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async processQuery(
    query: string,
    context: string,
    agentId: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGQueryResult> {
    try {
      const startTime = Date.now();
      
      // Preprocessing and setup
      const cleanedQuery = query.trim().replaceAll('\n', ' ');
      const metadata: Metadata = {
        agentId: agentId,
        query: cleanedQuery,
        timestamp: new Date().toISOString(),
        options: options
      };

      const response = await this.llmRouter.processQuery(query, context, {
        ...options,
        agentId,
        trackUsage: true // Enable usage tracking
      });

      // Track token usage after successful LLM call
      if (response.usage) {
        try {
          await UsageTracker.trackTokenUsage({
            teamId: options.teamId || 'default-team',
            agentId: agentId,
            provider: response.provider || 'openai',
            model: response.model || 'gpt-4o-mini',
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0
          });
        } catch (error) {
          console.error('❌ Failed to track usage:', error);
        }
      }

      // Response processing and return
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const result: RAGQueryResult = {
        ...response,
        metadata: metadata,
        processingTime: processingTime,
        query: cleanedQuery,
        context: context
      };

      return result;

    } catch (error) {
      console.error('❌ Error in EnhancedRAGLLMIntegration.processQuery:', error);
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      if (!text) {
        throw new Error('Text cannot be empty for generating embeddings.');
      }
      
      const result = await this.embeddings.embedQuery(text);
      return result;
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw error;
    }
  }

  async findRelevantDocs(query: string, k: number = 3, filter: object | undefined = undefined): Promise<Document[]> {
    try {
      if (!query) {
        throw new Error('Query cannot be empty for finding relevant docs.');
      }

      const queryEmbedding = await this.generateEmbeddings(query);
      const matches = await this.vectorStore.similaritySearchVectorWithScore(queryEmbedding, k, filter);

      return matches.map((match) => match.pageContent);
    } catch (error) {
      console.error('❌ Error finding relevant docs:', error);
      throw error;
    }
  }

  async ingestData(content: string, metadata: Metadata): Promise<string[]> {
    try {
      if (!content) {
        throw new Error('Content cannot be empty for data ingestion.');
      }

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const docs = await textSplitter.splitText(content);

      const ingestionPromises = docs.map(async (doc) => {
        const uuid = uuidv4();
        const embedding = await this.generateEmbeddings(doc);
        await this.vectorStore.addDocument(uuid, doc, embedding, metadata);
        return uuid;
      });

      const ids = await Promise.all(ingestionPromises);
      return ids;
    } catch (error) {
      console.error('❌ Error ingesting data:', error);
      throw error;
    }
  }
}
