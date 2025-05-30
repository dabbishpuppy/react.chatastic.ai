
import { AgentSource, SourceType } from "@/types/rag";
import { SourceCreateService } from "./operations/SourceCreateService";
import { SourceQueryService } from "./operations/SourceQueryService";
import { SourceUpdateService } from "./operations/SourceUpdateService";
import { SourceDeleteService } from "./operations/SourceDeleteService";

export class AgentSourceService {
  // Create operations
  static async createSource(data: {
    agent_id: string;
    source_type: SourceType;
    title: string;
    content?: string;
    metadata?: Record<string, any>;
    file_path?: string;
    url?: string;
    crawl_status?: string;
    progress?: number;
    links_count?: number;
    parent_source_id?: string;
    is_excluded?: boolean;
  }): Promise<AgentSource> {
    return SourceCreateService.createSource(data);
  }

  // Query operations
  static async getSourcesByAgent(agentId: string): Promise<AgentSource[]> {
    return SourceQueryService.getSourcesByAgent(agentId);
  }

  static async getSourcesByType(agentId: string, sourceType: SourceType): Promise<AgentSource[]> {
    return SourceQueryService.getSourcesByType(agentId, sourceType);
  }

  static async getSourceWithStats(id: string): Promise<AgentSource & { chunks_count: number }> {
    return SourceQueryService.getSourceWithStats(id);
  }

  // Update operations
  static async updateSource(id: string, updates: Partial<AgentSource & {
    crawl_status?: string;
    progress?: number;
    links_count?: number;
    is_excluded?: boolean;
    last_crawled_at?: string;
  }>): Promise<AgentSource> {
    return SourceUpdateService.updateSource(id, updates);
  }

  // Delete operations
  static async deactivateSource(id: string): Promise<boolean> {
    return SourceDeleteService.deactivateSource(id);
  }

  static async deleteSource(id: string): Promise<boolean> {
    return SourceDeleteService.deleteSource(id);
  }
}
